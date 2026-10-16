import { drive, step } from './robot.js'
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

        case 'repeat':
            /* continue here */
    }
}