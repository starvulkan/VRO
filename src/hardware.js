import { DEVICES, FACING_ANGLE, circumference } from './config.js'

export const MAX_DPS = 1000
const FIELD = { width: 2362, height: 1143 }
const RANGE_CM = 200

export const COLORS = ['red', 'green', 'blue', 'yellow', 'black', 'white', 'violet', 'azure', 'none']

export function makeHub(config, robot, pixels) {
    const motors = {}
    for (const device of config.devices) {
        if (device.type === 'motor') motors[device.port] = {angle: 0, dps: 0, speed: 75, zero: 0}
    }

    const wheels = {
        [config.drive.left]: { side: 'left', sign: -1, speed: 75, zero: 0 },
        [config.drive.right]: { side: 'right', sign: 1, speed: 75, zero: 0 },
    }

    return { config, robot, pixels, motors, wheels }
}

function device(hub, port, type) {
    return hub.config.devices.find((d) => d.port === port && d.type === type) ?? null
}

function placeOf(hub, part) {
    const { x, y, heading } = hub.robot
    return {
        x: x + Math.cos(heading) * part.x - Math.sin(heading) * part.y,
        y: y + Math.sin(heading) * part.x + Math.cos(heading) * part.y,
        angle: heading + (FACING_ANGLE[part.facing] ?? 0),
    }
}

export function isMotor(hub, port) {
    return Boolean(hub.motors[port] || hub.wheels[port])
}

export function motorAngle(hub, port) {
    const motor = hub.motors[port]
    if (motor) return motor.angle

    const wheel = hub.wheels[port]
    if (!wheel) return 0
    const travel = wheel.side === 'left' ? hub.robot.leftTravel : hub.robot.rightTravel
    return (wheel.sign * travel * 360) / circumference(hub.config)
}

export function motorSpeed(hub, port) {
    const motor = hub.motors[port]
    if (motor) return Math.round((motor.dps / MAX_DPS) * 100)

    const wheel = hub.wheels[port]
    if (!wheel) return 0
    const mms = wheel.side === 'left' ? hub.robot.left : hub.robot.right
    return Math.round(((wheel.sign * mms * 360) / circumference(hub.config) / MAX_DPS) * 100)
}

export function motorSetting(hub, port) {
    return (hub.motors[port] ?? hub.wheels[port])?.speed ?? 75
}

export function setMotorSetting(hub, port, percent) {
    const target = hub.motors[port] ?? hub.wheels[port]
    if (target) target.speed = Math.max(-100, Math.min(100, percent))
}

export function powerMotor(hub, port, percent) {
    const dps = (Math.max(-100, Math.min(100, percent)) / 100) * MAX_DPS

    const motor = hub.motors[port]
    if (motor) {
        motor.dps = dps
        return
    }

    const wheel = hub.wheels[port]
    if (!wheel) return
    hub.robot[wheel.side] = (wheel.sign * dps * circumference(hub.config)) / 360
}

export function snapMotor(hub, port, angle) {
    const motor = hub.motors[port]
    if (motor) motor.angle = angle
}

export function relativeAngle(hub, port) {
    return motorAngle(hub, port) - ((hub.motors[port] ?? hub.wheels[port])?.zero ?? 0)
}

export function setRelative(hub, port, value) {
    const target = hub.motors[port] ?? hub.wheels[port]
    if (target) target.zero = motorAngle(hub, port) - value
}

export function stopMotors(hub) {
    for (const motor of Object.values(hub.motors)) motor.dps = 0
}

export function stepMotors(hub, dt) {
    for (const motor of Object.values(hub.motors)) motor.angle += motor.dps * dt
}

function sample(hub, x, y) {
    const px = Math.round(x)
    const py = Math.round(FIELD.height - y)
    if (!hub.pixels || px < 2 || py < 2 || px >= FIELD.width - 2 || py >= FIELD.height - 2) return null

    let r = 0
    let g = 0
    let b = 0
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const i = ((py + dy) * FIELD.width + (px + dx)) * 4
            r += hub.pixels[i]
            g += hub.pixels[i + 1]
            b += hub.pixels[i + 2]
        }
    }
    return [r / 25, g / 25, b / 25]
}

export function classify([r, g, b]) {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const value = max / 255
    const saturation = max === 0 ? 0 : (max - min) / max

    if (value < 0.35) return 'black'
    if (saturation < 0.25) return value > 0.7 ? 'white' : 'black'

    let hue = 0
    if (max === r) hue = ((g - b) / (max - min)) * 60
    else if (max === g) hue = ((b - r) / (max - min)) * 60 + 120
    else hue = ((r - g) / (max - min)) * 60 + 240
    if (hue < 0) hue += 360

    if (hue < 25 || hue >= 335) return 'red'
    if (hue < 70) return 'yellow'
    if (hue < 165) return 'green'
    if (hue < 205) return 'azure'
    if (hue < 245) return 'blue'
    return 'violet'
}

export function readColor(hub, port) {
    const part = device(hub, port, 'color')
    if (!part) return { color: 'none', reflection: 0 }

    const spot = placeOf(hub, part)
    const rgb = sample(hub, spot.x, spot.y)
    if (!rgb) return { color: 'none', reflection: 0 }

    const reflection = Math.round(((0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255) * 100)
    return { color: classify(rgb), reflection }
}

function wallAhead(x, y, angle) {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let best = Infinity

    if (dx > 1e-9) best = Math.min(best, (FIELD.width - x) / dx)
    if (dx < -1e-9) best = Math.min(best, -x / dx)
    if (dy > 1e-9) best = Math.min(best, (FIELD.height - y) / dy)
    if (dy < -1e-9) best = Math.min(best, -y / dy)

    return best
}

export function readDistance(hub, port) {
    const part = device(hub, port, 'distance')
    if (!part) return RANGE_CM

    const spot = placeOf(hub, part)
    const mm = wallAhead(spot.x, spot.y, spot.angle) - DEVICES.distance.size / 2
    return Math.max(0, Math.min(RANGE_CM, Math.round(mm) / 10))
}

export function readForce(hub, port) {
    const part = device(hub, port, 'force')
    if (!part) return 0

    const spot = placeOf(hub, part)
    const gap = wallAhead(spot.x, spot.y, spot.angle) - DEVICES.force.size / 2
    return Math.max(0, Math.min(100, Math.round(-gap * 20)))
}

export function distanceIn(cm, unit) {
    if (unit === 'inches') return Math.round((cm / 2.54) * 10) / 10
    if (unit === '%') return Math.round((cm / RANGE_CM) * 100)
    return cm
}

