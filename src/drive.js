export const UNITS = ['rotations', 'degrees', 'seconds', 'cm', 'inches']

export function makeDrivebase(config = {}) {
    return {
        circumference: config.circumference ?? 175.9,
        maxSpeed: config.maxSpeed ?? 500,
        speed: config.speed ?? 50,
    }
}

function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value))
}

export function setSpeed(base, percent) {
    base.speed = clamp(percent, -100, 100)
}

export function setRotationDistance(base, cm) {
    if (cm > 0) base.circumference = cm * 10
}

export function toDistance(base, amount, unit) {
    if (unit === 'cm') return amount * 10
    if (unit === 'inches') return amount * 25.4
    if (unit === 'rotations') return amount * base.circumference
    if (unit === 'degrees') return (amount / 360) * base.circumference
    return 0
}

export function wheelSpeeds(base, steering = 0, backwards = false) {
    const rate = (base.speed / 100) * base.maxSpeed * (backwards ? -1 : 1)
    const turn = clamp(steering, -100, 100) / 100
    const inner = rate * (1 - 2 * Math.abs(turn))

    return turn >= 0 ? [rate, inner] : [inner, rate]
}

export function travelled(robot, from) {
    const left = Math.abs(robot.leftTravel - from.leftTravel)
    const right = Math.abs(robot.rightTravel - from.rightTravel)

    return (left + right) / 2
}