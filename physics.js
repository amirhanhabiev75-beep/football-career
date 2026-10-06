/**
 * PRO FOOTBALL ENGINE — CORE PHYSICS & VECTOR MATH
 * Модуль физической симуляции и векторной математики.
 * Отвечает за кинематику мяча, столкновения, расчет траекторий и расчет сил.
 */

export class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    clone() {
        return new Vector2D(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        if (n !== 0) {
            this.x /= n;
            this.y /= n;
        }
        return this;
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    mag() {
        return Math.sqrt(this.magSq());
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }

    normalize() {
        const m = this.mag();
        if (m !== 0) this.div(m);
        return this;
    }

    limit(max) {
        const mSq = this.magSq();
        if (mSq > max * max) {
            this.div(Math.sqrt(mSq)).mult(max);
        }
        return this;
    }

    dist(v) {
        return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    static fromAngle(angle, length = 1) {
        return new Vector2D(Math.cos(angle) * length, Math.sin(angle) * length);
    }

    static subVectors(v1, v2) {
        return new Vector2D(v1.x - v2.x, v1.y - v2.y);
    }
}

export class BallPhysics {
    constructor(pitchWidth, pitchHeight) {
        this.bounds = { width: pitchWidth, height: pitchHeight };
        this.pos = new Vector2D(pitchWidth / 2, pitchHeight / 2);
        this.vel = new Vector2D(0, 0);
        this.acc = new Vector2D(0, 0);
        
        // Высота и вертикальная скорость для 3D-эффекта (навесы, подкрутки)
        this.z = 0;
        this.zVel = 0;
        this.gravity = 0.45;

        // Физические константы газона и воздуха
        this.grassFriction = 0.965;
        this.airResistance = 0.988;
        this.bounceRestitution = 0.65; // Коэффициент отскока от земли
        this.radius = 4;
        
        // Вращение мяча (эффект Магнуса)
        this.spin = 0;
    }

    applyForce(forceVector) {
        this.acc.add(forceVector);
    }

    kick(angle, power, liftAngle = 0, spin = 0) {
        const force = Vector2D.fromAngle(angle, power);
        this.vel.add(force);
        this.zVel = Math.sin(liftAngle) * (power * 0.4);
        this.spin = spin;
    }

    update() {
        // Сила Магнуса (боковая подкрутка мяча)
        if (Math.abs(this.spin) > 0.01 && this.vel.magSq() > 0.1) {
            const perpAngle = this.vel.heading() + Math.PI / 2;
            const magnusForce = Vector2D.fromAngle(perpAngle, this.spin * this.vel.mag() * 0.02);
            this.applyForce(magnusForce);
            this.spin *= 0.95; // Затухание подкрутки
        }

        // Обновление плоскости (X, Y)
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.set(0, 0);

        // Расчет вертикали Z (гравитация и отскок)
        if (this.z > 0 || this.zVel !== 0) {
            this.z += this.zVel;
            this.zVel -= this.gravity;

            if (this.z <= 0) {
                this.z = 0;
                this.zVel = -this.zVel * this.bounceRestitution;
                if (Math.abs(this.zVel) < 0.2) this.zVel = 0;
            }
        }

        // Трение (на земле vs в воздухе)
        const currentFriction = this.z > 0.5 ? this.airResistance : this.grassFriction;
        this.vel.mult(currentFriction);

        // Гашение мизерных скоростей
        if (this.vel.magSq() < 0.005) {
            this.vel.set(0, 0);
        }

        this.checkCollisions();
    }

    checkCollisions() {
// Ограничения поля
        const minX = 10, maxX = this.bounds.width - 10;
        const minY = 10, maxY = this.bounds.height - 10;

        if (this.pos.x <= minX || this.pos.x >= maxX) {
            this.vel.x *= -0.7;
            this.pos.x = Math.max(minX, Math.min(this.pos.x, maxX));
        }

        if (this.pos.y <= minY || this.pos.y >= maxY) {
            this.vel.y *= -0.7;
            this.pos.y = Math.max(minY, Math.min(this.pos.y, maxY));
        }
    }

    reset(x = this.bounds.width / 2, y = this.bounds.height / 2) {
        this.pos.set(x, y);
        this.vel.set(0, 0);
        this.acc.set(0, 0);
        this.z = 0;
        this.zVel = 0;
        this.spin = 0;
    }
}

export class PlayerPhysics {
    constructor(x, y, maxSpeed, acceleration) {
        this.pos = new Vector2D(x, y);
        this.vel = new Vector2D(0, 0);
        this.acc = new Vector2D(0, 0);
        this.maxSpeed = maxSpeed;
        this.acceleration = acceleration;
        this.mass = 75; // кг
        this.radius = 6;
    }

    seek(targetPos, arrivalZone = 0) {
        const desired = Vector2D.subVectors(targetPos, this.pos);
        const distance = desired.mag();

        if (distance === 0) return new Vector2D(0, 0);

        if (arrivalZone > 0 && distance < arrivalZone) {
            const mappedSpeed = (distance / arrivalZone) * this.maxSpeed;
            desired.normalize().mult(mappedSpeed);
        } else {
            desired.normalize().mult(this.maxSpeed);
        }

        const steer = Vector2D.subVectors(desired, this.vel);
        steer.limit(this.acceleration);
        return steer;
    }

    separate(otherPlayers, minDistance = 14) {
        const steer = new Vector2D(0, 0);
        let count = 0;

        for (let i = 0; i < otherPlayers.length; i++) {
            const other = otherPlayers[i];
            const d = this.pos.dist(other.pos);

            if (d > 0 && d < minDistance) {
                const diff = Vector2D.subVectors(this.pos, other.pos);
                diff.normalize().div(d); // Чем ближе, тем сильнее отталкивание
                steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer.div(count);
        }

        if (steer.magSq() > 0) {
            steer.normalize().mult(this.maxSpeed).sub(this.vel).limit(this.acceleration * 1.5);
        }

        return steer;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.set(0, 0);
        this.vel.mult(0.92); // Сопротивление бегу
    }
}