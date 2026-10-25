// the robot builder with all its possible configs (like motors, sensors, etc) and what you p

export const PORTS = ['A', 'B', 'C', 'D', 'E', 'F']

export const DEVICES = {
    color: { label: 'Color sensor', size: 24, faces: false, tint: '#F2F2F2' },
    distance: { label: 'Distance sensor', size: 40, faces: true, tint: '#4CBFE6' },
    force: { label: 'Force sensor', size: 30, faces: true, tint: '#FFBF00' },
    motor: { label: 'Motor', size: 44, faces: false, tint: '#0090F5' },
}

export const FACINGS = ['front', 'back', 'left', 'right']

export const FACING_ANGLE = { front: 0, left: Math.PI / 2, back: Math.PI, right: -Math.PI / 2 }

export const DEFAULT_ROBOT = {
    name: 'VRObot',
    color: '#A06BFF',
    length: 180,
    width: 150,
    track: 120,
    wheel: 56,
    drive: { left: 'A', right: 'B' },
    devices: [
        { id: 1, type: 'color', port: 'C', x: 70, y: 0, facing: 'front' },
        { id: 2, type: 'distance', port: 'D', x: 90, y: 0, facing: 'front' },
    ],
}

const REACH = 240

function number(value, fallback, low, high){
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.min(high, Math.max(low, Math.round(n)))
}

export function normalize(raw) {
    const source = raw && typeof raw === 'object' ? raw : {}
    const base = DEFAULT_ROBOT

    const robot = {
        name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 32) : base.name,
        color: /^#[0-9a-f]{6}$/i.test(source.color) ? source.color : base.color,
        length: number(source.length, base.length, 60, 400),
        width: number(source.width, base.width, 60, 400),
        track: number(source.track, base.track, 40, 400),
        wheel: number(source.wheel, base.wheel, 20, 120),
        drive: { ...base.drive },
        devices: [],
    }

    const left = source.drive?.left
    const right = source.drive?.right
    if (PORTS.includes(left) && PORTS.includes(right) && left !== right) robot.drive = { left, right }

    const used = new Set([robot.drive.left, robot.drive.right])
    const list = Array.isArray(source.devices) ? source.devices : base.devices
    let id = 1

    for (const device of list) {
        if (!device || !DEVICES[device.type] || !PORTS.includes(device.port) || used.has(device.port)) continue
        used.add(device.port)
        robot.devices.push({
            id: id++,
            type: device.type,
            port: device.port,
            x: number(device.x, 0, -REACH, REACH),
            y: number(device.y, 0, -REACH, REACH),
            facing: FACINGS.includes(device.facing) ? device.facing : 'front',
        })
    }

    return robot
}

export function freePorts(robot, keep = null) {
    const used = new Set([robot.drive.left, robot.drive.right, ...robot.devices.map((d) => d.port)])
    return PORTS.filter((port) => port === keep || !used.has(port))
}

export function geometry(robot) {
    return { length: robot.length, width: robot.width, track: robot.track }
}

export function circumference(robot) {
    return Math.PI * robot.wheel
}