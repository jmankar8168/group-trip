/**
 * Host Simulation Mode Controller · "The Trip That Never Happened"
 * Manages setup, real-time bot simulation view, table modal, and
 * the live Player Inspector side drawer (single & dual pinned modes).
 */

class HostSimulationController {
  constructor(socket) {
    this.socket = socket;
    this.simId = null;
    this.seed = 42;
    this.scenario = 'REALISTIC';
    this.tableCount = 3;
    this.playersPerTable = 5;
    this.speed = 1.0;
    this.simTime = 120;
    this.durationSeconds = 120;
    this.isPaused = false;
    this.isEnded = false;

    // Simulation entities
    this.tables = []; // Table state
    this.botsMap = new Map(); // botId -> Bot state
    this.events = []; // Append-only stream
    this.goldenRevealed = new Set(); // tableId set

    // Inspector state
    this.inspectedBotId1 = null;
    this.inspectedBotId2 = null; // for dual pinned view
    this.activeTableModalId = null;

    // Replay state
    this.isReplaying = false;
    this.replayScrubTime = 120;

    this.bindSocketEvents();
    this.bindKeyboardShortcuts();
  }

  bindSocketEvents() {
    this.socket.on('sim_initialized', (data) => {
      this.simId = data.simId;
      this.seed = data.seed;
      this.scenario = data.scenario;
      this.tableCount = data.tableCount;
      this.playersPerTable = data.playersPerTable;
      this.speed = data.speed;
      this.simTime = data.durationSeconds || 120;
      this.durationSeconds = this.simTime;
      this.isPaused = false;
      this.isEnded = false;
      this.events = [];
      this.tables = data.tables || [];
      this.botsMap.clear();

      // Index bots
      this.tables.forEach(t => {
        t.status = t.status || 'Planning';
        t.chatFeed = [];
        t.activeTypers = new Set();
        t.proposals = [];
        t.currentProposal = null;
        t.blockedAttemptsCount = 0;

        t.bots.forEach(b => {
          b.checkedDates = [];
          b.votes = [];
          b.thoughts = [];
          b.currentActivity = 'idle';
          b.typingPartial = '';
          b.revealedConstraints = false;
          this.botsMap.set(b.id, b);
        });
      });

      this.renderLiveSimScreen();
      this.showSimView('sim-live-view');
    });

    this.socket.on('sim_tick', ({ simTime, tables }) => {
      if (this.isReplaying) return;
      this.simTime = simTime;
      this.updateTimerDisplay(simTime);

      // Update table status & typers
      if (tables) {
        tables.forEach(st => {
          const localTable = this.tables.find(t => t.id === st.id);
          if (localTable) {
            localTable.status = st.status;
            localTable.blockedAttemptsCount = st.blockedAttemptsCount;
            this.updateTableCardUI(localTable);
          }
        });
      }

      // Update active inspector drawers live!
      this.updateActiveInspectors();
    });

    this.socket.on('sim_event', (event) => {
      this.events.push(event);
      this.handleIncomingEvent(event);
    });

    this.socket.on('sim_status_change', ({ status, isPaused }) => {
      this.isPaused = isPaused;
      const pauseBtn = document.getElementById('sim-top-pause-btn');
      if (pauseBtn) {
        pauseBtn.innerHTML = isPaused ? '▶ Resume' : '⏸ Pause';
      }
    });

    this.socket.on('sim_speed_change', ({ speed }) => {
      this.speed = speed;
      document.querySelectorAll('.sim-speed-pill').forEach(btn => {
        btn.classList.toggle('selected', parseFloat(btn.getAttribute('data-speed')) === speed);
      });
    });

    this.socket.on('sim_ended', (debriefData) => {
      this.isEnded = true;
      this.renderDebriefSlides(debriefData);
      this.showSimView('sim-results-view');
    });
  }

  handleIncomingEvent(event) {
    const { type, tableId, playerId, data } = event;
    const table = this.tables.find(t => t.id === tableId);
    const bot = this.botsMap.get(playerId);

    switch (type) {
      case 'chat_typing_started':
      case 'chat_typing_update':
        if (bot) {
          bot.currentActivity = 'typing';
          bot.typingPartial = data.partialText || '';
          if (table) table.activeTypers.add(bot.nickname);
        }
        break;

      case 'chat_sent':
        if (bot) {
          bot.currentActivity = 'idle';
          bot.typingPartial = '';
          if (table) {
            table.activeTypers.delete(bot.nickname);
            table.chatFeed.push({
              senderId: bot.id,
              senderNick: bot.nickname,
              senderStyle: data.senderStyle || bot.style?.label,
              text: data.text,
              simTime: event.simTime
            });
            this.updateTableChatPreview(table);
            if (this.activeTableModalId === table.id) {
              this.renderTableModalContent(table);
            }
          }
        }
        break;

      case 'calendar_tap':
        if (bot) {
          if (!bot.checkedDates) bot.checkedDates = [];
          bot.checkedDates.push({
            dayIndex: data.dayIndex,
            dateString: data.dateString,
            fits: data.fits,
            reason: data.reason,
            simTime: event.simTime
          });
        }
        break;

      case 'selection_changed':
        if (bot) {
          bot.currentSelections = {
            destination: data.destination || bot.currentSelections?.destination,
            transport: data.transport || bot.currentSelections?.transport,
            activity: data.activity || bot.currentSelections?.activity,
            dates: data.dates || bot.currentSelections?.dates
          };
        }
        break;

      case 'proposal_submitted':
        if (table) {
          table.status = 'Proposal pending';
          table.currentProposal = {
            id: data.proposalId,
            proposerNick: data.proposerNick,
            plan: data.plan,
            votes: {},
            simTime: event.simTime
          };
          this.updateTableCardUI(table);
        }
        break;

      case 'vote_cast':
        if (bot && table && table.currentProposal) {
          table.currentProposal.votes[bot.id] = data.vote;
          if (!bot.votes) bot.votes = [];
          bot.votes.push({
            proposalId: data.proposalId,
            vote: data.vote,
            simTime: event.simTime
          });
          if (this.activeTableModalId === table.id) {
            this.renderTableModalContent(table);
          }
        }
        break;

      case 'proposal_blocked':
        if (table) {
          table.status = 'Blocked';
          table.blockedAttemptsCount = data.blockedAttemptsCount || (table.blockedAttemptsCount + 1);
          table.currentProposal = null;
          this.updateTableCardUI(table);
          this.showTableNotice(table, `⛔ BLOCKED: ${data.dealbreaker}`, 'danger');
        }
        break;

      case 'trip_locked':
        if (table) {
          table.status = 'Locked';
          table.lockedPlan = data.lockedPlan;
          table.lockedTime = data.lockedTime;
          table.currentProposal = null;
          this.updateTableCardUI(table);
          this.showTableNotice(table, `🎉 TRIP LOCKED in ${data.lockedTime}s!`, 'success');
        }
        break;

      case 'plot_twist_fired':
        this.displayTwistAnnouncement(data);
        if (bot) {
          bot.activeTwist = {
            title: data.twistText,
            description: data.twistText
          };
        }
        break;

      case 'bot_thought':
        if (bot) {
          if (!bot.thoughts) bot.thoughts = [];
          bot.thoughts.unshift({
            thought: data.thought,
            simTime: event.simTime
          });
        }
        break;
    }

    // Refresh open drawers
    if (this.inspectedBotId1 === playerId || this.inspectedBotId2 === playerId) {
      this.updateActiveInspectors();
    }
  }

  showSimView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
  }

  // -------------------------------------------------------------
  // SIMULATION SETUP ACTIONS
  // -------------------------------------------------------------
  startSimulation() {
    this.socket.emit('sim_start', {
      tableCount: this.tableCount,
      playersPerTable: this.playersPerTable,
      scenario: this.scenario,
      seed: this.seed,
      speed: this.speed
    });
  }

  setSpeed(newSpeed) {
    this.speed = newSpeed;
    this.socket.emit('sim_control', { action: 'set_speed', speed: newSpeed });
  }

  togglePause() {
    this.socket.emit('sim_control', { action: this.isPaused ? 'resume' : 'pause' });
  }

  restartSimulation() {
    this.startSimulation();
  }

  // -------------------------------------------------------------
  // LIVE SIMULATION SCREEN RENDERING
  // -------------------------------------------------------------
  renderLiveSimScreen() {
    const container = document.getElementById('sim-tables-container');
    if (!container) return;

    // Header info
    document.getElementById('sim-meta-scenario').textContent = this.scenario;
    document.getElementById('sim-meta-seed').textContent = `Seed #${this.seed}`;
    document.getElementById('sim-meta-tables').textContent = `${this.tables.length} Tables &bull; ${this.tables.length * this.playersPerTable} Bots`;

    container.innerHTML = this.tables.map(table => {
      return `
        <div class="sim-table-card ${table.status.toLowerCase()}" id="table-card-${table.id}">
          <div>
            <div class="sim-table-header">
              <h3 class="sim-table-title">${table.name}</h3>
              <span class="sim-status-chip ${table.status.toLowerCase()}" id="status-chip-${table.id}">
                ${this.getStatusLabel(table.status)}
              </span>
            </div>

            <!-- Bot Players Roster -->
            <div class="sim-bots-roster" id="roster-${table.id}">
              ${table.bots.map(bot => `
                <button type="button" class="sim-bot-pill" id="bot-pill-${bot.id}" data-bot-id="${bot.id}" title="Click to inspect ${bot.nickname}">
                  <span class="sim-bot-dot"></span>
                  <span>${bot.nickname}</span>
                  <span style="font-size: 0.7rem; opacity: 0.65;">(${bot.style?.label || 'Bot'})</span>
                </button>
              `).join('')}
            </div>

            <!-- Notice Banner (Blocks / Locks) -->
            <div id="table-notice-${table.id}" style="display: none; padding: 0.5rem 0.75rem; border-radius: 12px; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.75rem;"></div>

            <!-- Last 3 Messages Preview -->
            <div class="kicker" style="font-size: 10px; margin-bottom: 0.25rem;">Live Chat Feed (Last 3)</div>
            <div class="sim-table-chat-preview" id="chat-preview-${table.id}">
              <div style="color: var(--mute); font-style: italic;">Connecting to table chat...</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="sim-table-actions">
            <button class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.9rem; border-radius: 99px;" onclick="window.simController.openTableModal('${table.id}')">
              💬 View Full Chat &amp; Proposals
            </button>
            <button class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.9rem; border-radius: 99px;" onclick="window.simController.openPlayerInspector('${table.bots[0].id}')">
              🔍 Inspect Player
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach bot pill click listeners
    container.querySelectorAll('.sim-bot-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const botId = pill.getAttribute('data-bot-id');
        this.openPlayerInspector(botId);
      });
    });
  }

  updateTableCardUI(table) {
    const cardEl = document.getElementById(`table-card-${table.id}`);
    const chipEl = document.getElementById(`status-chip-${table.id}`);
    if (!cardEl || !chipEl) return;

    cardEl.className = `sim-table-card ${table.status.toLowerCase()}`;
    chipEl.className = `sim-status-chip ${table.status.toLowerCase()}`;
    chipEl.innerHTML = this.getStatusLabel(table.status);

    // Update bot typing indicators on pills
    table.bots.forEach(bot => {
      const pill = document.getElementById(`bot-pill-${bot.id}`);
      if (pill) {
        pill.classList.toggle('typing', bot.currentActivity === 'typing');
      }
    });
  }

  updateTableChatPreview(table) {
    const previewEl = document.getElementById(`chat-preview-${table.id}`);
    if (!previewEl) return;

    const recent = table.chatFeed.slice(-3);
    if (recent.length === 0) {
      previewEl.innerHTML = `<div style="color: var(--mute); font-style: italic;">No messages yet.</div>`;
      return;
    }

    previewEl.innerHTML = recent.map(m => `
      <div class="sim-chat-preview-line">
        <strong style="color: var(--ink);">${m.senderNick}:</strong> ${this.escapeHTML(m.text)}
      </div>
    `).join('');
  }

  showTableNotice(table, message, type = 'info') {
    const noticeEl = document.getElementById(`table-notice-${table.id}`);
    if (!noticeEl) return;
    noticeEl.style.display = 'block';
    if (type === 'danger') {
      noticeEl.style.background = 'var(--o)';
      noticeEl.style.color = '#ffffff';
    } else if (type === 'success') {
      noticeEl.style.background = 'var(--g)';
      noticeEl.style.color = '#ffffff';
    }
    noticeEl.textContent = message;
  }

  getStatusLabel(status) {
    switch (status) {
      case 'Planning': return '💬 Planning';
      case 'Proposal pending': return '🗳️ Voting Proposal';
      case 'Blocked': return '⛔ Proposal Blocked';
      case 'Locked': return '✅ Trip Locked';
      case 'Failed': return '❌ Failed';
      default: return status;
    }
  }

  updateTimerDisplay(remaining) {
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    const str = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    const el = document.getElementById('sim-timer-digits');
    if (el) el.textContent = str;

    const arc = document.getElementById('sim-timer-arc');
    if (arc) {
      const total = this.durationSeconds || 120;
      const progress = Math.max(0, remaining / total);
      arc.style.strokeDashoffset = 534 * (1 - progress);
    }
  }

  displayTwistAnnouncement(twistData) {
    const banner = document.getElementById('sim-twist-announcement-banner');
    if (!banner) return;
    banner.style.display = 'flex';
    document.getElementById('sim-twist-text').textContent = twistData.twistText;
    document.getElementById('sim-twist-target').textContent = `Target: ${twistData.targetNickname} (${twistData.newConstraint})`;

    setTimeout(() => {
      banner.style.display = 'none';
    }, 8000);
  }

  // -------------------------------------------------------------
  // PLAYER INSPECTOR SIDE DRAWER (SINGLE & DUAL PINNED MODES)
  // -------------------------------------------------------------
  openPlayerInspector(botId, slot = 1) {
    if (slot === 1) {
      this.inspectedBotId1 = botId;
    } else {
      this.inspectedBotId2 = botId;
    }

    const drawer1 = document.getElementById('sim-inspector-drawer-1');
    const drawer2 = document.getElementById('sim-inspector-drawer-2');
    const container = document.getElementById('sim-dual-inspector-container');
    const overlay = document.getElementById('sim-inspector-overlay');

    if (overlay) overlay.classList.add('active');

    if (this.inspectedBotId2) {
      // Dual mode active!
      if (container) container.classList.add('active');
      if (drawer1) drawer1.classList.add('active');
      if (drawer2) drawer2.classList.add('active');
      this.renderInspectorDrawer(this.inspectedBotId1, 1);
      this.renderInspectorDrawer(this.inspectedBotId2, 2);
    } else {
      // Single drawer mode
      if (container) container.classList.add('active');
      if (drawer1) drawer1.classList.add('active');
      if (drawer2) drawer2.classList.remove('active');
      this.renderInspectorDrawer(this.inspectedBotId1, 1);
    }
  }

  closePlayerInspector(slot = 0) {
    if (slot === 1) {
      this.inspectedBotId1 = this.inspectedBotId2;
      this.inspectedBotId2 = null;
    } else if (slot === 2) {
      this.inspectedBotId2 = null;
    } else {
      this.inspectedBotId1 = null;
      this.inspectedBotId2 = null;
    }

    const drawer1 = document.getElementById('sim-inspector-drawer-1');
    const drawer2 = document.getElementById('sim-inspector-drawer-2');
    const container = document.getElementById('sim-dual-inspector-container');
    const overlay = document.getElementById('sim-inspector-overlay');

    if (!this.inspectedBotId1) {
      if (drawer1) drawer1.classList.remove('active');
      if (drawer2) drawer2.classList.remove('active');
      if (container) container.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
    } else {
      this.openPlayerInspector(this.inspectedBotId1, 1);
    }
  }

  togglePinPlayer(botId) {
    if (this.inspectedBotId2 === botId) {
      this.closePlayerInspector(2);
    } else if (this.inspectedBotId1 === botId) {
      // Prompt user or pick another bot
      const table = this.tables.find(t => t.bots.some(b => b.id === botId));
      const nextBot = table?.bots.find(b => b.id !== botId);
      if (nextBot) this.openPlayerInspector(nextBot.id, 2);
    } else {
      this.openPlayerInspector(botId, 2);
    }
  }

  updateActiveInspectors() {
    if (this.inspectedBotId1) this.renderInspectorDrawer(this.inspectedBotId1, 1);
    if (this.inspectedBotId2) this.renderInspectorDrawer(this.inspectedBotId2, 2);
  }

  renderInspectorDrawer(botId, slot = 1) {
    const bot = this.botsMap.get(botId);
    if (!bot) return;

    const drawerEl = document.getElementById(`sim-inspector-drawer-${slot}`);
    if (!drawerEl) return;

    const table = this.tables.find(t => t.id === bot.tableId);
    const isTyping = bot.currentActivity === 'typing';

    // Activity Display
    const activityHtml = isTyping
      ? `<div style="color: var(--o); font-weight: 700;">✍️ Typing: “${this.escapeHTML(bot.typingPartial)}”<span class="sim-typing-cursor"></span></div>`
      : `<div style="color: var(--mute);">💤 Idle &bull; Observing table chat</div>`;

    // Constraints HTML
    const hardConstraints = bot.roleCard?.hardConstraints || [];
    const pettyConstraints = bot.roleCard?.pettyConstraints || [];
    const budget = bot.roleCard?.personalBudget || { max: 10000 };

    const constraintsHtml = `
      <div class="sim-constraint-item">
        <div>
          <span style="font-weight: 700;">💰 Budget Cap:</span> ₹${budget.max.toLocaleString()}
        </div>
        <span class="${bot.revealedConstraints ? 'sim-badge-revealed' : 'sim-badge-hidden'}">
          ${bot.revealedConstraints ? 'Revealed' : '🔒 Hidden'}
        </span>
      </div>
      ${hardConstraints.map(c => `
        <div class="sim-constraint-item">
          <div>
            <span style="font-weight: 700;">${c.label || c.type}</span>
          </div>
          <span class="${bot.revealedConstraints ? 'sim-badge-revealed' : 'sim-badge-hidden'}">
            ${bot.revealedConstraints ? 'Revealed' : '🔒 Hidden'}
          </span>
        </div>
      `).join('')}
      ${pettyConstraints.map(p => `
        <div class="sim-constraint-item">
          <div>
            <span>${p.emoji || '⚠️'}</span> <strong>${p.playerLine || p.tag}</strong>
          </div>
          <span class="${bot.revealedConstraints ? 'sim-badge-revealed' : 'sim-badge-hidden'}">
            ${bot.revealedConstraints ? 'Revealed' : '🔒 Hidden'}
          </span>
        </div>
      `).join('')}
      ${bot.activeTwist ? `
        <div class="sim-constraint-item" style="border: 2px solid var(--o); background: rgba(255, 90, 54, 0.08);">
          <div>
            <span style="color: var(--o); font-weight: 800;">🔥 PLOT TWIST:</span>
            <div>${bot.activeTwist.title || bot.activeTwist.description}</div>
          </div>
          <span class="sim-badge-revealed">Active</span>
        </div>
      ` : ''}
    `;

    // Mini Calendar
    const calGridHtml = Array.from({ length: 28 }, (_, i) => {
      const dayNum = i + 1;
      const checked = (bot.checkedDates || []).find(c => c.dayIndex === dayNum);
      const isGolden = table?.goldenWindows?.some(w => dayNum >= w.start && dayNum <= w.end);
      const isRevealed = this.goldenRevealed.has(table?.id);

      let classes = ['sim-cal-day-cell'];
      let icon = `${dayNum}`;
      let title = `Day ${dayNum}`;

      if (checked) {
        if (checked.fits) {
          classes.push('fits');
          icon = `✓ ${dayNum}`;
          title = `Day ${dayNum}: Fits!`;
        } else {
          classes.push('conflicts');
          icon = `✕ ${dayNum}`;
          title = `Day ${dayNum}: ${checked.reason || 'Conflict'}`;
        }
      }

      if (isGolden && isRevealed) {
        classes.push('golden');
        title += ' (Golden Window)';
      }

      return `<div class="${classes.join(' ')}" title="${title}">${icon}</div>`;
    }).join('');

    // Thoughts stream
    const thoughtsHtml = (bot.thoughts || []).length > 0
      ? bot.thoughts.slice(0, 15).map(t => `
          <div class="sim-thought-entry">
            <span style="opacity: 0.6;">[${this.formatSimTime(t.simTime)}]</span> ${this.escapeHTML(t.thought)}
          </div>
        `).join('')
      : `<div style="opacity: 0.5; font-style: italic;">No thoughts recorded yet.</div>`;

    // Votes log
    const votesHtml = (bot.votes || []).length > 0
      ? bot.votes.map(v => `
          <div style="font-size: 0.85rem; padding: 0.35rem 0; border-bottom: 1px dashed var(--border-color); display: flex; justify-content: space-between;">
            <span>Proposal #${v.proposalId}</span>
            <span class="pill ${v.vote === 'yes' ? 'pill-green' : 'pill-yellow'}" style="font-size: 0.75rem; padding: 0.1rem 0.5rem;">${v.vote.toUpperCase()}</span>
          </div>
        `).join('')
      : `<div style="color: var(--mute); font-size: 0.85rem; font-style: italic;">No votes cast yet.</div>`;

    // Selections
    const sel = bot.currentSelections || {};

    drawerEl.innerHTML = `
      <div class="sim-drawer-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1.5rem;">${bot.roleCard?.emoji || '👤'}</span>
            <h2 style="font-size: 1.6rem; margin: 0; font-family: var(--font-serif);">${bot.nickname}</h2>
            <span class="pill pill-lavender" style="font-size: 0.75rem; font-weight: 700;">${bot.style?.label || 'Bot'}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--mute);">
            ${table?.name || 'Table'} &bull; ${bot.roleCard?.name || 'Traveler'}
          </div>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; border-radius: 99px;" onclick="window.simController.togglePinPlayer('${bot.id}')" title="Pin side-by-side to compare">
            📌 Pin
          </button>
          <button class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.35rem 0.65rem; border-radius: 99px;" onclick="window.simController.closePlayerInspector(${slot})">
            ✕
          </button>
        </div>
      </div>

      <div class="sim-drawer-body">
        <!-- Live Activity -->
        <div class="sim-live-activity-box">
          <div class="kicker" style="font-size: 10px; margin-bottom: 0.25rem;">Live Bot Status</div>
          ${activityHtml}
        </div>

        <!-- Secret Constraints (Revealed vs Hidden) -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0;">Secret Constraints</h4>
            <span style="font-size: 0.75rem; color: var(--mute);">Disclosure: ${bot.style?.key === 'AGREEABLE' || bot.style?.key === 'SILENT' ? 'Late / Hidden' : 'Early'}</span>
          </div>
          ${constraintsHtml}
        </div>

        <!-- Current Selections -->
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 0.5rem;">Current Candidate Selections</h4>
          <div style="background: var(--paper); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.75rem 1rem; font-size: 0.85rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <div><strong>Destination:</strong> ${sel.destination || 'Gokarna'}</div>
            <div><strong>Transport:</strong> ${sel.transport || 'Train'}</div>
            <div><strong>Activity:</strong> ${sel.activity || 'Sightseeing'}</div>
            <div><strong>Dates:</strong> ${sel.dates?.label || 'Weekend 1'}</div>
          </div>
        </div>

        <!-- Private Calendar -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0;">Private Calendar Taps</h4>
            <span style="font-size: 0.75rem; color: var(--mute);">28-Day Month</span>
          </div>
          <div class="sim-inspector-calendar">
            ${calGridHtml}
          </div>
        </div>

        <!-- Proposal Votes -->
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 0.5rem;">Proposal Votes</h4>
          ${votesHtml}
        </div>

        <!-- Bot Thoughts Feed (Scrolling inner monologue) -->
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 0.5rem;">Bot Thoughts Stream (Inner Monologue)</h4>
          <div class="sim-thoughts-log">
            ${thoughtsHtml}
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // TABLE MODAL VIEW (CHAT & PROPOSALS)
  // -------------------------------------------------------------
  openTableModal(tableId) {
    this.activeTableModalId = tableId;
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return;

    let modal = document.getElementById('sim-table-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sim-table-modal';
      modal.className = 'twist-modal';
      document.body.appendChild(modal);
    }

    this.renderTableModalContent(table);
    modal.classList.add('active');
  }

  closeTableModal() {
    this.activeTableModalId = null;
    const modal = document.getElementById('sim-table-modal');
    if (modal) modal.classList.remove('active');
  }

  renderTableModalContent(table) {
    const modal = document.getElementById('sim-table-modal');
    if (!modal) return;

    const isRevealed = this.goldenRevealed.has(table.id);
    const goldenHtml = isRevealed
      ? table.goldenWindows.map(w => `<span class="pill pill-green" style="font-size: 0.8rem;">✨ ${w.label}</span>`).join(' ')
      : `<button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;" onclick="window.simController.toggleRevealGolden('${table.id}')">👁️ Reveal Golden Window</button>`;

    const prop = table.currentProposal;
    const proposalHtml = prop
      ? `
        <div style="background: var(--lavender); border: 2px solid var(--ink); border-radius: 16px; padding: 1rem; margin-bottom: 1rem;">
          <div class="kicker" style="color: var(--ink); margin-bottom: 0.25rem;">Active Proposal &bull; By ${prop.proposerNick}</div>
          <h4 style="font-size: 1.2rem; margin: 0 0 0.5rem 0;">${prop.plan.destination} (${prop.plan.transportMode}) on ${prop.plan.startDate}</h4>
          <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem;">
            <strong>Votes:</strong>
            <span class="pill pill-green" style="font-size: 0.75rem;">YES: ${Object.values(prop.votes).filter(v => v === 'yes').length}</span>
            <span class="pill pill-yellow" style="font-size: 0.75rem;">NO: ${Object.values(prop.votes).filter(v => v === 'no').length}</span>
            <span>(${Object.keys(prop.votes).length} of ${table.bots.length} voted)</span>
          </div>
        </div>
      `
      : `<div style="font-size: 0.85rem; color: var(--mute); margin-bottom: 1rem; font-style: italic;">No active proposal on table.</div>`;

    modal.innerHTML = `
      <div class="twist-content-box" style="max-width: 760px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1.5px solid var(--border-color); padding-bottom: 0.75rem;">
          <div>
            <h2 style="font-size: 1.8rem; margin: 0; font-family: var(--font-serif);">${table.name}</h2>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem;">
              <span class="sim-status-chip ${table.status.toLowerCase()}">${this.getStatusLabel(table.status)}</span>
              <span>Golden Window: ${goldenHtml}</span>
            </div>
          </div>
          <button class="btn btn-secondary" style="border-radius: 99px; padding: 0.4rem 0.8rem;" onclick="window.simController.closeTableModal()">✕ Close</button>
        </div>

        <!-- Proposal Status -->
        ${proposalHtml}

        <!-- Full Chat Feed -->
        <div class="kicker" style="margin-bottom: 0.4rem;">Table Deliberation Chat</div>
        <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 1rem; height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
          ${table.chatFeed.map(m => `
            <div style="font-size: 0.9rem; line-height: 1.4;">
              <strong style="color: var(--ink); cursor: pointer;" onclick="window.simController.openPlayerInspector('${m.senderId}')" title="Click to inspect">${m.senderNick} <span style="font-size: 0.7rem; color: var(--mute);">(${m.senderStyle})</span>:</strong>
              ${this.escapeHTML(m.text)}
            </div>
          `).join('')}
          ${Array.from(table.activeTypers).map(name => `
            <div style="font-size: 0.85rem; color: var(--o); font-style: italic;">
              ${name} is typing...
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  toggleRevealGolden(tableId) {
    if (this.goldenRevealed.has(tableId)) {
      this.goldenRevealed.delete(tableId);
    } else {
      this.goldenRevealed.add(tableId);
    }
    const table = this.tables.find(t => t.id === tableId);
    if (table && this.activeTableModalId === tableId) {
      this.renderTableModalContent(table);
    }
    this.updateActiveInspectors();
  }

  // -------------------------------------------------------------
  // DEBRIEF SLIDES WITH REAL SIMULATION DATA
  // -------------------------------------------------------------
  renderDebriefSlides(debrief) {
    // Populate Slide 1: Headline numbers
    const rateEl = document.getElementById('res-success-rate');
    if (rateEl) rateEl.textContent = `${debrief.successRate}%`;
    document.getElementById('res-total-groups').textContent = debrief.totalTables;
    document.getElementById('res-total-players').textContent = debrief.totalPlayers;
    document.getElementById('res-locked-count').textContent = debrief.lockedCount;

    // Subline
    const subline = document.getElementById('res-headline-subline');
    if (subline) {
      subline.textContent = debrief.successRate >= 50
        ? "Consensus reached under decentralized constraints."
        : "Nobody failed. The decentralized communication process did.";
    }

    // Populate Slide 2: Leaderboard
    const tbody = document.getElementById('leaderboard-tbody');
    if (tbody) {
      tbody.innerHTML = debrief.leaderboard.map(row => {
        let verdictClass = 'verdict-failed';
        if (row.outcome === 'Trip locked') verdictClass = 'verdict-happy';
        else if (row.blockedAttempts > 0) verdictClass = 'verdict-compromise';

        const goldenStr = (row.goldenWindows || []).map(w => w.label).join(', ') || 'None';

        return `
          <tr class="leaderboard-row" onclick="alert('Hidden Golden Windows for ${row.name}: ${goldenStr}')">
            <td class="leaderboard-cell">${row.name}</td>
            <td class="leaderboard-cell"><span class="verdict-chip ${verdictClass}">${row.outcome}</span></td>
            <td class="leaderboard-cell">${row.timeTaken}</td>
            <td class="leaderboard-cell">${row.blockedAttempts}</td>
            <td class="leaderboard-cell">★ ${row.avgSatisfaction} / 5</td>
            <td class="leaderboard-cell">${row.outcome === 'Trip locked' ? 'Locked' : 'Process Breakdown'}</td>
          </tr>
        `;
      }).join('');
    }

    // Populate Slide 3: Failure points
    const barsContainer = document.getElementById('blocked-bars-container');
    if (barsContainer) {
      const cats = debrief.blockedCategories || {};
      const totalBlocks = Object.values(cats).reduce((a, b) => a + b, 0) || 1;

      barsContainer.innerHTML = Object.entries(cats).map(([cat, count]) => {
        const pct = Math.round((count / totalBlocks) * 100);
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.25rem;">
              <span>${cat}</span>
              <span>${count} times (${pct}%)</span>
            </div>
            <div style="width: 100%; height: 10px; background: var(--paper); border-radius: 99px; overflow: hidden; border: 1px solid var(--border-color);">
              <div style="width: ${pct}%; height: 100%; background: var(--o);"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Slide 4: Human side
    const feltHeardEl = document.getElementById('res-felt-heard-stat');
    if (feltHeardEl) feltHeardEl.textContent = `${debrief.humanSide?.feltHeardPercent || 45}%`;

    // Show Replay Bar
    const replayBar = document.getElementById('sim-replay-bar');
    if (replayBar) replayBar.style.display = 'flex';
  }

  // -------------------------------------------------------------
  // REPLAY & EXPORT CONTROLS
  // -------------------------------------------------------------
  scrubReplay(targetSimTime) {
    this.isReplaying = true;
    this.replayScrubTime = targetSimTime;
    this.updateTimerDisplay(targetSimTime);

    // Reset table states
    this.tables.forEach(t => {
      t.status = 'Planning';
      t.chatFeed = [];
      t.activeTypers.clear();
      t.blockedAttemptsCount = 0;
    });

    this.botsMap.forEach(b => {
      b.checkedDates = [];
      b.votes = [];
      b.thoughts = [];
      b.currentActivity = 'idle';
      b.typingPartial = '';
    });

    // Replay events from round start down to targetSimTime
    this.events.forEach(ev => {
      if (ev.simTime >= targetSimTime) {
        this.handleIncomingEvent(ev);
      }
    });

    this.updateActiveInspectors();
  }

  exportEventsJSON() {
    if (!this.simId) return;
    window.location.href = `/api/simulation/${this.simId}/events.json`;
  }

  // -------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // -------------------------------------------------------------
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Esc closes inspector
      if (e.key === 'Escape') {
        if (this.inspectedBotId1 || this.inspectedBotId2) {
          this.closePlayerInspector(0);
        } else if (this.activeTableModalId) {
          this.closeTableModal();
        }
      }

      // Left/Right arrow keys cycle through players at current table
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!this.inspectedBotId1) return;
        const currentBot = this.botsMap.get(this.inspectedBotId1);
        if (!currentBot) return;

        const table = this.tables.find(t => t.id === currentBot.tableId);
        if (!table || table.bots.length === 0) return;

        const curIdx = table.bots.findIndex(b => b.id === currentBot.id);
        let nextIdx = e.key === 'ArrowRight' ? curIdx + 1 : curIdx - 1;
        if (nextIdx < 0) nextIdx = table.bots.length - 1;
        if (nextIdx >= table.bots.length) nextIdx = 0;

        this.openPlayerInspector(table.bots[nextIdx].id, 1);
      }
    });
  }

  formatSimTime(sec) {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  }

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.HostSimulationController = HostSimulationController;
