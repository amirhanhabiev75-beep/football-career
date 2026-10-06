import { Player, MatchEngine } from './script.js';

// === СОСТОЯНИЕ ИГРЫ (STATE) ===
class CareerState {
    constructor() {
        this.clubName = 'ФК Грифон';
        this.budget = 50000000; // $50.0M
        this.weeklyWages = 0;
        this.season = 1;
        this.week = 1;

        this.squad = [];
        this.transferMarket = [];
        this.currentMatch = null;
        this.tacticalFormation = '4-3-3';

        this.initSquad();
        this.generateTransferMarket();
    }

    initSquad() {
        // Создаем стартовый состав (11 игроков + скамейка)
        const squadTemplates = [
            { name: 'А. Максименко', pos: 'GK', ovr: 78, line: 'GK' },
            { name: 'Д. Хлусевич', pos: 'RB', ovr: 75, line: 'DEF' },
            { name: 'Г. Джикия', pos: 'CB', ovr: 79, line: 'DEF' },
            { name: 'С. Бабич', pos: 'CB', ovr: 77, line: 'DEF' },
            { name: 'Д. Пруцев', pos: 'LB', ovr: 74, line: 'DEF' },
            { name: 'Р. Зобнин', pos: 'CDM', ovr: 78, line: 'MID' },
            { name: 'Д. Баринов', pos: 'CM', ovr: 79, line: 'MID' },
            { name: 'Э. Сперцян', pos: 'CAM', ovr: 82, line: 'MID' },
            { name: 'К. Промес', pos: 'LW', ovr: 81, line: 'ATT' },
            { name: 'А. Соболев', pos: 'ST', ovr: 78, line: 'ATT' },
            { name: 'И. Обляков', pos: 'RW', ovr: 77, line: 'ATT' },
            // Замена
            { name: 'М. Игнатов', pos: 'CAM', ovr: 73, line: 'MID' },
            { name: 'П. Мелешин', pos: 'ST', ovr: 70, line: 'ATT' },
            { name: 'Н. Чернов', pos: 'CB', ovr: 74, line: 'DEF' }
        ];

        this.squad = squadTemplates.map((t, index) => {
            const p = new Player(index + 1, t.name, 21 + Math.floor(Math.random() * 8), t.pos, t.ovr);
            p.line = t.line;
            return p;
        });

        this.updateWageBill();
    }

    generateTransferMarket() {
        const names = ['Мартинес', 'Силва', 'Дюбуа', 'Ковачич', 'Ван Дейк', 'Шмидт', 'Барелла', 'Гомес', 'Сане', 'Диас'];
        const positions = ['CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'GK'];

        this.transferMarket = [];
        for (let i = 0; i < 15; i++) {
            const name = names[Math.floor(Math.random() * names.length)] + ' ' + String.fromCharCode(65 + i) + '.';
            const pos = positions[Math.floor(Math.random() * positions.length)];
            const ovr = 70 + Math.floor(Math.random() * 18);
            const player = new Player(100 + i, name, 18 + Math.floor(Math.random() * 12), pos, ovr);
            this.transferMarket.push(player);
        }
    }

    updateWageBill() {
        this.weeklyWages = this.squad.reduce((sum, p) => sum + p.salary, 0);
    }
}

// === УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ (UI CONTROLLER) ===
class UIController {
    constructor(state) {
        this.state = state;
        this.activeTab = 'squad';

        this.initNavigation();
        this.renderSidebar();
        this.renderSquad();
        this.drawTacticsPitch();
        this.renderTransfers();
        this.renderFinance();
        this.initMatchSim();
    }

    // 1. НАВИГАЦИЯ ПО ВКЛАДКАМ
    initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = btn.getAttribute('data-tab');
                
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(targetTab).classList.add('active');

                this.activeTab = targetTab;
                if (targetTab === 'squad') this.drawTacticsPitch();
            });
        });

        // Смена тактики
        const tacticSelect = document.getElementById('tacticSelect');
        if (tacticSelect) {
            tacticSelect.addEventListener('change', (e) => {
this.state.tacticalFormation = e.target.value;
                this.drawTacticsPitch();
            });
        }
    }

    renderSidebar() {
        document.getElementById('sidebarClubName').innerText = this.state.clubName;
        document.getElementById('sidebarBudget').innerText = `Бюджет: $${(this.state.budget / 1000000).toFixed(1)}M`;
        document.getElementById('sidebarSeason').innerText = `Сезон ${this.state.season} | Неделя ${this.state.week}`;
    }

    // 2. ОТРИСОВКА СОСТАВА И ТАКТИЧЕСКОЙ ДОСКИ (CANVAS)
    renderSquad() {
        const container = document.getElementById('playersList');
        if (!container) return;

        container.innerHTML = '';
        this.state.squad.forEach(p => {
            const card = document.createElement('div');
            card.className = 'player-card-mini';
            card.innerHTML = `
                <div>
                    <strong>${p.name}</strong> 
                    <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 6px;">${p.position} (${p.age} лет)</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">⚡ ${Math.round(p.stamina)}%</span>
                    <span class="ovr-pill">${p.ovr}</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    drawTacticsPitch() {
        const canvas = document.getElementById('squadPitchCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Очистка и разметка футбольного поля
        ctx.fillStyle = '#1a472a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Линии поля
        ctx.strokeStyle = '#ffffff33';
        ctx.lineWidth = 2;
        
        // Внешняя рамка и центр
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 20);
        ctx.lineTo(canvas.width / 2, canvas.height - 20);
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Координаты расстановок
        const formations = {
            '4-3-3': [
                { x: 60, y: 260, pos: 'GK' },
                { x: 160, y: 90, pos: 'LB' }, { x: 150, y: 200, pos: 'CB' }, { x: 150, y: 320, pos: 'CB' }, { x: 160, y: 430, pos: 'RB' },
                { x: 300, y: 140, pos: 'CM' }, { x: 280, y: 260, pos: 'CDM' }, { x: 300, y: 380, pos: 'CM' },
                { x: 480, y: 100, pos: 'LW' }, { x: 520, y: 260, pos: 'ST' }, { x: 480, y: 420, pos: 'RW' }
            ],
            '4-4-2': [
                { x: 60, y: 260, pos: 'GK' },
                { x: 160, y: 90, pos: 'LB' }, { x: 150, y: 200, pos: 'CB' }, { x: 150, y: 320, pos: 'CB' }, { x: 160, y: 430, pos: 'RB' },
                { x: 320, y: 90, pos: 'LM' }, { x: 300, y: 200, pos: 'CM' }, { x: 300, y: 320, pos: 'CM' }, { x: 320, y: 430, pos: 'RM' },
                { x: 500, y: 190, pos: 'ST' }, { x: 500, y: 330, pos: 'ST' }
            ],
            '3-5-2': [
                { x: 60, y: 260, pos: 'GK' },
                { x: 160, y: 140, pos: 'CB' }, { x: 150, y: 260, pos: 'CB' }, { x: 160, y: 380, pos: 'CB' },
                { x: 300, y: 70, pos: 'LWB' }, { x: 290, y: 190, pos: 'CDM' }, { x: 320, y: 260, pos: 'CAM' }, { x: 290, y: 330, pos: 'CDM' }, { x: 300, y: 450, pos: 'RWB' },
                { x: 500, y: 190, pos: 'ST' }, { x: 500, y: 330, pos: 'ST' }
            ]
        };

        const currentCoords = formations[this.state.tacticalFormation] || formations['4-3-3'];

        // Отрисовка фишек игроков на поле
        currentCoords.forEach((spot, i) => {
            const player = this.state.squad[i] || { name: 'Игрок', ovr: 70 };

            ctx.beginPath();
            ctx.arc(spot.x, spot.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff87';
            ctx.fill();
ctx.lineWidth = 2;
            ctx.strokeStyle = '#000';
            ctx.stroke();

            // Текст OVR внутри круга
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(player.ovr, spot.x, spot.y);

            // Имя игрока под фишкой
            ctx.fillStyle = '#fff';
            ctx.font = '11px Inter';
            ctx.fillText(player.name.split(' ')[1] || player.name, spot.x, spot.y + 28);
        });
    }

    // 3. ТРАНСФЕРНЫЙ РЫНОК
    renderTransfers() {
        const tableBody = document.getElementById('transferMarketTable');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        this.state.transferMarket.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td>${p.position}</td>
                <td>${p.age}</td>
                <td><span class="ovr-pill">${p.ovr}</span></td>
                <td><strong style="color: var(--accent-blue)">${p.potential}</strong></td>
                <td>$${(p.marketValue / 1000000).toFixed(1)}M</td>
                <td>$${(p.salary / 1000).toFixed(0)}k</td>
                <td><button class="action-btn buy-btn" data-id="${p.id}">Купить</button></td>
            `;

            row.querySelector('.buy-btn').addEventListener('click', () => this.buyPlayer(p));
            tableBody.appendChild(row);
        });
    }

    buyPlayer(player) {
        if (this.state.budget < player.marketValue) {
            alert('Недостаточно средств в бюджете клуба!');
            return;
        }

        this.state.budget -= player.marketValue;
        this.state.transferMarket = this.state.transferMarket.filter(p => p.id !== player.id);
        this.state.squad.push(player);
        this.state.updateWageBill();

        this.renderSidebar();
        this.renderSquad();
        this.drawTacticsPitch();
        this.renderTransfers();
        this.renderFinance();

        alert(`Контракт с ${player.name} успешно подписан!`);
    }

    // 4. ФИНАНСЫ
    renderFinance() {
        document.getElementById('financeBalance').innerText = `$${(this.state.budget / 1000000).toFixed(2)}M`;
        document.getElementById('financeWage').innerText = `$${(this.state.weeklyWages / 1000).toFixed(0)}k / нед.`;
    }

    // 5. ЦЕНТР МАТЧА И LIVE СИМУЛЯЦИЯ
    initMatchSim() {
        const btnStart = document.getElementById('btnStartSim');
        if (!btnStart) return;

        btnStart.addEventListener('click', () => {
            // Создаем команду соперника
            const awaySquad = Array.from({ length: 11 }, (_, i) => new Player(200 + i, `Соперник ${i + 1}`, 25, 'CM', 79));
            const homeTeam = { name: this.state.clubName, squad: this.state.squad };
            const awayTeam = { name: 'Зенит', squad: awaySquad };

            const engine = new MatchEngine(homeTeam, awayTeam);
            btnStart.disabled = true;

            const logList = document.getElementById('matchEventsLog');
            logList.innerHTML = '';

            // Запуск таймера матча (каждые 150мс = 1 игровая минута)
            const interval = setInterval(() => {
                const running = engine.simulateTick();

                // Обновление UI во время симуляции
                document.getElementById('liveScore').innerText = `${engine.score.home} : ${engine.score.away}`;
                document.getElementById('liveTime').innerText = `${String(engine.time).padStart(2, '0')}:00`;

                document.getElementById('homeXG').innerText = engine.stats.home.xG.toFixed(2);
                document.getElementById('awayXG').innerText = engine.stats.away.xG.toFixed(2);
                document.getElementById('homeShots').innerText = `${engine.stats.home.shots} (${engine.stats.home.shotsOnTarget})`;
document.getElementById('awayShots').innerText = `${engine.stats.away.shots} (${engine.stats.away.shotsOnTarget})`;
                document.getElementById('homePoss').innerText = `${engine.stats.home.possession}%`;
                document.getElementById('awayPoss').innerText = `${engine.stats.away.possession}%`;

                // Вывод новых событий в ленту
                if (engine.events.length > logList.children.length) {
                    const lastEvent = engine.events[engine.events.length - 1];
                    const item = document.createElement('div');
                    item.className = 'event-item';
                    item.innerText = `[${lastEvent.minute}'] ${lastEvent.text}`;
                    logList.prepend(item);
                }

                if (!running) {
                    clearInterval(interval);
                    btnStart.disabled = false;
                    
                    const endItem = document.createElement('div');
                    endItem.className = 'event-item';
                    endItem.style.borderLeft = '3px solid var(--accent-color)';
                    endItem.innerText = `🏁 ФИНАЛЬНЫЙ СВИСТОК! Итоговый счет ${engine.score.home}:${engine.score.away}`;
                    logList.prepend(endItem);

                    this.renderSquad(); // Обновление усталости после матча
                }
            }, 150);
        });
    }
}

// === ТОЧКА ВХОДА ИНИЦИАЛИЗАЦИИ ===
document.addEventListener('DOMContentLoaded', () => {
    const careerState = new CareerState();
    window.app = new UIController(careerState);
});