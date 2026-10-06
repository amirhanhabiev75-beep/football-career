/**
 * PRO FOOTBALL CAREER ENGINE v2027
 * Архитектура: Моделирование характеристик, форма, мораль, потенциал,
 * статистика матча (xG, физика утомления, тактические профили).
 */

// === 1. ГЕНЕРАТОР И ВЫЧИСЛИТЕЛЬ ХАРАКТЕРИСТИК ИГРОКОВ ===
export class Player {
    constructor(id, name, age, position, baseOvr) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.position = position; // GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST
        this.potential = Math.min(99, baseOvr + Math.floor(Math.random() * 12) + 2);
        
        // Динамические состояния
        this.stamina = 100;    // Выносливость на матч
        this.form = 80 + Math.floor(Math.random() * 20); // Текущая форма (0-100)
        this.morale = 85;      // Моральный дух (0-100)
        this.sharpness = 75;   // Тонус (0-100)
        
        // Статистика сезона
        this.stats = {
            matches: 0,
            goals: 0,
            assists: 0,
            ratingHistory: [],
            yellowCards: 0,
            redCards: 0
        };

        // Детализированные атрибуты (генерация на основе базового OVR и позиции)
        this.attributes = this.generateAttributes(baseOvr, position);
        this.ovr = this.calculateOVR();
        this.marketValue = this.calculateMarketValue();
        this.salary = Math.round((this.marketValue * 0.002) / 52) * 52; // Недельная зарплата
    }

    generateAttributes(base, pos) {
        const rnd = (delta) => Math.min(99, Math.max(40, base + Math.floor(Math.random() * delta - delta / 2)));
        
        // Профилирование характеристик под позицию
        const isDef = ['CB', 'LB', 'RB', 'CDM'].includes(pos);
        const isAtt = ['ST', 'LW', 'RW', 'CAM'].includes(pos);
        const isGK = pos === 'GK';

        return {
            pace: isGK ? 40 : rnd(15),
            shooting: isAtt ? rnd(10) + 5 : (isDef ? rnd(20) - 10 : rnd(12)),
            passing: pos === 'CAM' || pos === 'CM' ? rnd(8) + 6 : rnd(14),
            dribbling: isAtt ? rnd(10) + 4 : rnd(16),
            defending: isDef ? rnd(10) + 8 : rnd(22) - 12,
            physicality: rnd(14),
            goalkeeping: isGK ? base : 15
        };
    }

    calculateOVR() {
        const a = this.attributes;
        if (this.position === 'GK') return a.goalkeeping;
        
        // Весовые коэффициенты позиций в стиле FIFA 27
        const weights = {
            ST:  { shooting: 0.35, pace: 0.20, dribbling: 0.20, physicality: 0.15, passing: 0.10 },
            CAM: { passing: 0.30, dribbling: 0.30, shooting: 0.20, pace: 0.10, physicality: 0.10 },
            CB:  { defending: 0.45, physicality: 0.30, pace: 0.10, passing: 0.10, dribbling: 0.05 },
            CM:  { passing: 0.25, dribbling: 0.20, defending: 0.20, shooting: 0.15, pace: 0.10, physicality: 0.10 }
        };

        const w = weights[this.position] || weights.CM;
        let ovr = 0;
        for (let key in w) {
            ovr += (a[key] || 50) * w[key];
        }
        return Math.round(ovr);
    }

    calculateMarketValue() {
        // Формула оценки стоимости (возраст + OVR + потенциал)
        const ageFactor = this.age < 23 ? 1.4 : (this.age > 30 ? 0.6 : 1.0);
        const baseVal = Math.pow(this.ovr, 4.2) * 0.12;
        return Math.round(baseVal * ageFactor);
    }
}

// === 2. ТАКТИЧЕСКИЙ ДВИЖОК И ДИНАМИКА МАТЧА (xG MATH) ===
export class MatchEngine {
    constructor(homeTeam, awayTeam) {
        this.home = homeTeam;
        this.away = awayTeam;
        this.time = 0; // Минуты
        this.score = { home: 0, away: 0 };
        this.events = [];
        this.stats = {
            home: { shots: 0, shotsOnTarget: 0, xG: 0, possession: 50, passes: 0, fouls: 0 },
            away: { shots: 0, shotsOnTarget: 0, xG: 0, possession: 50, passes: 0, fouls: 0 }
        };
    }

    // Расчет совокупного рейтинга линии команды с учетом морали и формы
    calculateLinePower(team, line) {
const players = team.squad.filter(p => p.line === line);
        if (players.length === 0) return 60;
        
        const sum = players.reduce((acc, p) => {
            const effectiveOvr = p.ovr * (p.stamina / 100) * (0.8 + (p.form / 100) * 0.2);
            return acc + effectiveOvr;
        }, 0);
        return sum / players.length;
    }

    simulateTick() {
        if (this.time >= 90) return false;
        this.time++;

        // Сравнение сил полузащиты для расчета владения
        const homeMid = this.calculateLinePower(this.home, 'MID');
        const awayMid = this.calculateLinePower(this.away, 'MID');
        const possessionDelta = (homeMid - awayMid) * 0.1;
        
        this.stats.home.possession = Math.min(80, Math.max(20, Math.round(50 + possessionDelta)));
        this.stats.away.possession = 100 - this.stats.home.possession;

        // Генерация опасных моментов на основе вероятности
        const attackingSide = Math.random() * 100 < this.stats.home.possession ? 'home' : 'away';
        const defenderSide = attackingSide === 'home' ? 'away' : 'home';

        const attackPower = this.calculateLinePower(this[attackingSide], 'ATT');
        const defensePower = this.calculateLinePower(this[defenderSide], 'DEF');

        // Вероятность создания шанса за минуту
        const chanceThreshold = 0.08 + (attackPower - defensePower) * 0.003;

        if (Math.random() < chanceThreshold) {
            this.processShot(attackingSide, defenderSide);
        }

        // Утомление игроков во время матча
        [...this.home.squad, ...this.away.squad].forEach(p => {
            p.stamina = Math.max(30, p.stamina - 0.12);
        });

        return true;
    }

    processShot(attKey, defKey) {
        const attStats = this.stats[attKey];
        attStats.shots++;

        // Расчет коэффициента xG (ожидаемых голов)
        const shotQuality = Math.random();
        const xG = parseFloat((0.03 + shotQuality * 0.45).toFixed(2));
        attStats.xG = parseFloat((attStats.xG + xG).toFixed(2));

        if (shotQuality > 0.3) {
            attStats.shotsOnTarget++;
            
            // Вратарь соперника пытается отбить
            const gkPower = this.calculateLinePower(this[defKey], 'GK');
            const goalProbability = xG * (110 - gkPower) / 50;

            if (Math.random() < goalProbability) {
                this.score[attKey]++;
                this.events.push({
                    minute: this.time,
                    type: 'GOAL',
                    team: attKey,
                    text: `⚽ ГОЛ! (${attKey === 'home' ? this.home.name : this.away.name}) Удар достоин мирового класса! (xG: ${xG})`
                });
            }
        }
    }
}