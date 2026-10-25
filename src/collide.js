import { DEVICES, FACING_ANGLE } from './config.js'

const FIELD = { width: 2362, height: 1143 }
const SQUEEZE = 5

export function outline(config) {
    const halfLength = config.length / 2
    const halfWidth = config.width / 2
    const points = [
        [halfLength, halfWidth],
        [halfLength, -halfWidth],
        [-halfLength, halfWidth],
        [-halfLength, -halfWidth],
    ]

    for (const device of config.devices) {
        const half = DEVICES[device.type].size / 2
        let corners = [[half, half], [half, -half], [-half, half], [-half, -half]]

        if (device.type === 'force') {
            const angle = FACING_ANGLE[device.facing]
            const fx = Math.round(Math.cos(angle))
            const fy = Math.round(Math.sin(angle))
            corners = corners.map(([x, y]) => (x * fx + y * fy > 0 ? [x - fx * SQUEEZE, y - fy * SQUEEZE] : [x, y]))
        }

        for (const [x, y] of corners) points.push([device.x + x, device.y + y])
    }

    return points
}

export function keepInside(robot, points) {
    const cos = Math.cos(robot.heading)
    const sin = Math.sin(robot.heading)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const [px, py] of points) {
        const x = robot.x + cos * px - sin * py
        const y = robot.y + sin * px + cos * py
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
    }

    let dx = 0
    let dy = 0
    if (minX < 0) dx = -minX
    else if (maxX > FIELD.width) dx = FIELD.width - maxX
    if (minY < 0) dy = -minY
    else if (maxY > FIELD.height) dy = FIELD.height - maxY

    robot.x += dx
    robot.y += dy
    return dx !== 0 || dy !== 0
}