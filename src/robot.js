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

        leftTravel: 0,
        rightTravel: 0,
    }
}

export function drive(robot, left, right) {
    robot.left = left
    robot.right = right
}

export function step(robot, dt) {
    const v = (robot.left + robot.right) / 2
    const omega = (robot.right - robot.left) / robot.track
    const from = robot.heading
    const to = from + omega * dt

    if (Math.abs(omega) < 1e-9) {
        robot.x += v * Math.cos(from) * dt
        robot.y += v * Math.sin(from) * dt
    } else {
        const radius = v / omega
        robot.x += radius * (Math.sin(to) - Math.sin(from))
        robot.y -= radius * (Math.cos(to) - Math.cos(from))
    }

    robot.heading = to

    robot.leftTravel += robot.left * dt
    robot.rightTravel += robot.right * dt
}