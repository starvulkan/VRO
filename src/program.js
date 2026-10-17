import { drive } from './robot.js'
import { setSpeed, setRotationDistance, toDistance, wheelSpeeds, travelled } from './drive.js'

export function makeRunner(robot, base, program = []) {
    return {
        robot,
        base,
        stack: [{ body: program, index: 0 }],
        active: null,
        clock: 0,
        done: false,
    }
}

function nextStep(runner) {
    while (runner.stack.length) {
        const frame = runner.stack[runner.stack.length - 1]

        if (frame.loop && frame.body.length === 0) {
            runner.stack.pop()
            continue
        }

        if (frame.index < frame.body.length) {
            return frame.body[frame.index++]
        }

        if (frame.loop === 'forever') {
            frame.index = 0
            continue
        }

        if (frame.loop === 'repeat' && frame.remaining > 1) {
            frame.remaining -= 1
            frame.index = 0
            continue
        }

        runner.stack.pop()
    }

    return null
}

function begin(runner, step) {
    const { robot, base } = runner

    switch (step.op) {
        case 'setSpeed':
            setSpeed(base, step.percent)
            return
        
        case 'setRotationDistance':
            setRotationDistance(base, step.cm)
            return

        case 'stopMoving':
            drive(robot, 0, 0)
            return

        case 'startMoving':
        case 'startMovingSteering': {
            const steering = step.op === 'startMovingSteering' ? step.steering : 0
            const [left, right] = wheelSpeeds(base, steering, step.direction === 'back')
            drive(robot, left, right)
            return
        }

        case 'wait':
            runner.active = { kind: 'wait', until: runner.clock + Math.max(0, step.seconds) }
            return

        case 'move':
        case 'moveSteering': {
            const steering = step.op === 'moveSteering' ? step.steering : 0
            const [left, right] = wheelSpeeds(base, steering, step.direction === 'back')
            drive(robot, left, right)

            if (step.unit === 'seconds') {
                runner.active = { kind: 'timed', until: runner.clock + Math.max(0, step.amount) }
                return
            }

            runner.active = {
                kind: 'distance',
                target: Math.abs(toDistance(base, step.amount, step.unit)),
                from: { leftTravel: robot.leftTravel, rightTravel: robot.rightTravel }
            }
            return
        }

        case 'repeat': {
            const times = Math.max(0, Math.floor(step.times ?? 0))
            if (times === 0) return

            runner.stack.push({
                body: step.body ?? [],
                index: 0,
                loop: 'repeat',
                remaining: times,
            })
            return
        }

        case 'forever': {
            runner.stack.push({
                body: step.body ?? [],
                index: 0,
                loop: 'forever',
                remaining: 0,
            })
            return
        }

    }
}

function finished(runner) {
    const active = runner.active
    if (!active) return true

    if (active.kind === 'wait' || active.kind === 'timed') {
        return runner.clock >= active.until
    }

    if (active.kind === 'distance') {
        return travelled(runner.robot, active.from) >= active.target
    }

    return true
}

export function advance(runner, dt) {
    if (runner.done) return

    runner.clock += dt

    let budget = 10000

    while (!runner.done && finished(runner) && budget-- > 0) {
        if (runner.active && runner.active.kind !== 'wait') {
            drive(runner.robot, 0, 0)
        }
        runner.active = null

        const next = nextStep(runner)
        if (!next) {
            runner.done = true
            drive(runner.robot, 0, 0)
            return
        }

        begin(runner, next)
    }
}