export function makeRobot(config = {}) {
    return {
        x: config.x ?? 0,
        y: config.y ?? 0,
        heading: config.heading ?? 0,

        track: config.track ?? 120,
        length: config.length ?? 180,
        width: config.width ?? 150,

        left: 0,
        right: 0,
    }
}

export function drive(robot, left, right) {
    robot.left = left
    robot.right = right
}

export function step(robot, dt) {
    const v = (robot.left + robot.right) / 2
    const omega = (robot.right - robot.left) / robot.track

    robot.x += v * Math.cos(robot.heading) * dt
    robot.y += v * Math.sin(robot.heading) * dt
    robot.heading += omega * dt
}