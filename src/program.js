import { drive } from './robot.js'
import { setSpeed, setRotationDistance, toDistance, wheelSpeeds, travelled } from './drive.js'
import {
  readColor, readDistance, readForce, distanceIn,
  isMotor, powerMotor, motorAngle, motorSpeed, motorSetting, setMotorSetting,
  snapMotor, relativeAngle, setRelative, stopMotors,
} from './hardware.js'

const YIELD = Symbol('yield')
const RAD = Math.PI / 180
const YAW_SIGN = 1

const MATH = {
    abs: Math.abs,
    floor: Math.floor,
    ceiling: Math.ceil,
    sqrt: Math.sqrt,
    sin: (x) => Math.sin(x * RAD),
    cos: (x) => Math.cos(x * RAD),
    tan: (x) => Math.tan(x * RAD),
    asin: (x) => Math.asin(x) / RAD,
    acos: (x) => Math.acos(x) / RAD,
    atan: (x) => Math.atan(x) / RAD,
    ln: Math.log,
    log: Math.log10,
    'e^': Math.exp,
    '10^': (x) => 10 ** x,
}

export function toNumber(value) {
    if (typeof value === 'boolean') return value ? 1 : 0
    const number = Number(value)
    return Number.isNaN(number) ? 0 : number
}

export function truthy(value) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0 && !Number.isNaN(value)
    const text = String(value).trim().toLowerCase()
    return text !== '' && text !== '0' && text !== 'false'
}

function blank(value) {
    return typeof value === 'string' && value.trim() === ''
}

function compare(a, b) {
    const x = Number(a)
    const y = Number(b)
    if (!blank(a) && !blank(b) && !Number.isNaN(x) && !Number.isNaN(y)) return x - y

    const s = String(a).toLowerCase()
    const t = String(b).toLowerCase()
    return s < t ? -1 : s > t ? 1 : 0
}

function random(low, high) {
    const lo = Math.min(low, high)
    const hi = Math.max(low, high)
    if (Number.isInteger(lo) && Number.isInteger(hi)) {
        return lo + Math.floor(Math.random() * (hi - lo + 1))
    }
    return lo + Math.random() * (hi - lo)
}

function tidy(value) {
    return Math.round(value * 1e10) / 1e10
}

function scopeOf(runner, name) {
  const stack = runner.current?.stack ?? []
  for (let i = stack.length - 1; i >= 0; i--) {
    const scope = stack[i].scope
    if (scope) return scope.has(name) ? scope : runner.vars
  }
  return runner.vars
}

function wrap360(degrees) {
  return ((Math.round(degrees) % 360) + 360) % 360
}

function yaw(runner) {
  const degrees = ((runner.robot.heading - runner.yawZero) / RAD) * YAW_SIGN
  return Math.round(((((degrees + 180) % 360) + 360) % 360) - 180)
}

export function evaluate(runner, e) {
    if (!e) return 0

    const v = (x) => evaluate(runner, x)
    const n = (x) => toNumber(evaluate(runner, x))

    switch (e.r) {
        case 'n':
        case 't':
            return e.v
        case 'var':
          return scopeOf(runner, e.name).get(e.name) ?? 0
        case 'timer':
          return runner.clock - runner.timerStart
        case 'angle':
          return e.axis === 'yaw' ? yaw(runner) : 0

        case 'color':
          return readColor(runner.hub, e.port).color
        case 'isColor':
          return readColor(runner.hub, e.port).color === e.color
        case 'reflection':
          return readColor(runner.hub, e.port).reflection
        case 'reflectionIs': {
          const light = readColor(runner.hub, e.port).reflection
          const target = n(e.a)
          if (e.cmp === '<') return light < target
          if (e.cmp === '>') return light > target
          return light === Math.round(target)
        }
        case 'distance':
          return distanceIn(readDistance(runner.hub, e.port), e.unit)
        case 'distanceIs': {
          const distance = distanceIn(readDistance(runner.hub, e.port), e.unit)
          const target = n(e.a)
          if (e.cmp === 'closer') return distance < target
          if (e.cmp === 'farther') return distance > target
          return Math.abs(distance - target) <= 0.5
        }
        case 'pressure': {
          const force = readForce(runner.hub, e.port)
          return e.unit === 'newtons' ? force / 10 : force
        }
        case 'pressed': {
          const force = readForce(runner.hub, e.port)
          if (e.state === 'released') return force === 0
          if (e.state === 'hard') return force >= 80
          return force > 0
        }
        case 'motorPosition':
          return wrap360(motorAngle(runner.hub, e.port))
        case 'motorRelative':
          return Math.round(relativeAngle(runner.hub, e.port))
        case 'motorSpeed':
          return motorSpeed(runner.hub, e.port)

        case 'add':
            return n(e.a) + n(e.b)
        case 'sub':
            return n(e.a) - n(e.b)
        case 'mul':
            return n(e.a) * n(e.b)
        case 'div':
            return n(e.a) / n(e.b)
        case 'mod': {
            const a = n(e.a)
            const b = n(e.b)
            return ((a % b) + b) % b
        }
        case 'round':
            return Math.round(n(e.a))
        case 'math': {
            const fn = MATH[e.fn]
            return fn ? tidy(fn(n(e.a))) : 0
        }
        case 'random':
            return random(n(e.a), n(e.b))

        case 'gt':
            return compare(v(e.a), v(e.b)) > 0
        case 'lt':
            return compare(v(e.a), v(e.b)) < 0
        case 'eq':
            return compare(v(e.a), v(e.b)) === 0
        case 'and':
            return truthy(v(e.a)) && truthy(v(e.b))
        case 'or':
            return truthy(v(e.a)) || truthy(v(e.b))
        case 'not':
            return !truthy(v(e.a))
        case 'between': {
            const x = n(e.a)
            const lo = Math.min(n(e.b), n(e.c))
            const hi = Math.max(n(e.b), n(e.c))
            return x >= lo && x <= hi
        }

        case 'join':
            return String(v(e.a)) + String(v(e.b))
        case 'letter':
            return String(v(e.b))[Math.floor(n(e.a)) - 1] ?? ''
        case 'length':
            return String(v(e.a)).length
        case 'contains':
            return String(v(e.a)).toLowerCase().includes(String(v(e.b)).toLowerCase())
        
        default:
            return 0
    }
}

export function makeRunner(robot, base, program, hub) {
  return {
    robot,
    base,
    hub,
    threads: program.stacks.map((body) => ({
      stack: [{ kind: 'seq', body, index: 0 }],
      active: null,
      done: false,
    })),
    procedures: program.procedures ?? {},
    vars: new Map(),
    clock: 0,
    timerStart: 0,
    yawZero: robot.heading,
    current: null,
    done: false,
  }
}

function nextStep(runner, thread) {
  while (thread.stack.length > 0) {
    const frame = thread.stack[thread.stack.length - 1]

    if (frame.index < frame.body.length) return frame.body[frame.index++]

    if (frame.kind === 'forever') {
      frame.index = 0
      return YIELD
    }
    if (frame.kind === 'repeat' && frame.remaining > 1) {
      frame.remaining -= 1
      frame.index = 0
      return YIELD
    }
    if (frame.kind === 'until' && !truthy(evaluate(runner, frame.cond))) {
      frame.index = 0
      return YIELD
    }

    thread.stack.pop()
  }
  return null
}

function runMotor(runner, thread, port, sign, amount, unit) {
  const { hub } = runner
  const power = sign * motorSetting(hub, port)
  if (!isMotor(hub, port) || power === 0) return

  powerMotor(hub, port, power)

  if (unit === 'seconds') {
    thread.active = { kind: 'timed', until: runner.clock + amount, port }
    return
  }

  const target = unit === 'rotations' ? amount * 360 : amount
  thread.active = { kind: 'turn', port, from: motorAngle(hub, port), target, direction: Math.sign(power) }
}

function begin(runner, thread, cmd) {
  const { robot, base } = runner
  const num = (e) => toNumber(evaluate(runner, e))

  switch (cmd.op) {
    case 'setSpeed':
      setSpeed(base, num(cmd.percent))
      return
    case 'setRotationDistance':
      setRotationDistance(base, num(cmd.cm))
      return
    case 'stopMoving':
      drive(robot, 0, 0)
      return
    case 'startMoving':
      drive(robot, ...wheelSpeeds(base, 0, cmd.direction === 'back'))
      return
    case 'startMovingSteering':
      drive(robot, ...wheelSpeeds(base, num(cmd.steering)))
      return

    case 'move':
    case 'moveSteering': {
      const steering = cmd.op === 'moveSteering' ? num(cmd.steering) : 0
      const amount = num(cmd.amount)
      const backwards = (cmd.direction === 'back') !== (amount < 0)

      drive(robot, ...wheelSpeeds(base, steering, backwards))

      if (cmd.unit === 'seconds') {
        thread.active = { kind: 'timed', until: runner.clock + Math.abs(amount) }
      } else {
        thread.active = {
          kind: 'distance',
          target: Math.abs(toDistance(base, amount, cmd.unit)),
          from: { leftTravel: robot.leftTravel, rightTravel: robot.rightTravel },
        }
      }
      return
    }

    case 'wait':
      thread.active = { kind: 'wait', until: runner.clock + Math.max(0, num(cmd.seconds)) }
      return
    case 'waitUntil':
      thread.active = { kind: 'until', cond: cmd.cond }
      return

    case 'repeat': {
      const times = Math.floor(num(cmd.times))
      if (times > 0) thread.stack.push({ kind: 'repeat', body: cmd.body, index: 0, remaining: times })
      return
    }
    case 'forever':
      thread.stack.push({ kind: 'forever', body: cmd.body, index: 0 })
      return
    case 'repeatUntil':
      if (!truthy(evaluate(runner, cmd.cond))) {
        thread.stack.push({ kind: 'until', body: cmd.body, index: 0, cond: cmd.cond })
      }
      return
    case 'if':
      if (truthy(evaluate(runner, cmd.cond))) {
        thread.stack.push({ kind: 'seq', body: cmd.body, index: 0 })
      }
      return
    case 'ifElse': {
      const body = truthy(evaluate(runner, cmd.cond)) ? cmd.body : cmd.other
      thread.stack.push({ kind: 'seq', body, index: 0 })
      return
    }

    case 'stop':
      if (cmd.what === 'all') {
        for (const other of runner.threads) other.done = true
        runner.done = true
        drive(robot, 0, 0)
        stopMotors(runner.hub)
      } else if (cmd.what === 'exit') {
        while (thread.stack.length > 0) {
          if (thread.stack.pop().kind === 'call') break
        }
      } else {
        thread.done = true
      }
      return
    case 'stopOthers':
      for (const other of runner.threads) {
        if (other !== thread) other.done = true
      }
      return

    case 'set':
      scopeOf(runner, cmd.name).set(cmd.name, evaluate(runner, cmd.value))
      return
    case 'change': {
      const scope = scopeOf(runner, cmd.name)
      scope.set(cmd.name, toNumber(scope.get(cmd.name) ?? 0) + num(cmd.by))
      return
    }
    case 'resetTimer':
      runner.timerStart = runner.clock
      return
    case 'setYaw':
      runner.yawZero = robot.heading - num(cmd.value) * YAW_SIGN * RAD
      return

    case 'motorRun': {
      const amount = num(cmd.amount)
      const sign = (cmd.direction === 'counterclockwise' ? -1 : 1) * (amount < 0 ? -1 : 1)
      runMotor(runner, thread, cmd.port, sign, Math.abs(amount), cmd.unit)
      return
    }
    case 'motorGoTo': {
      const now = wrap360(motorAngle(runner.hub, cmd.port))
      const target = wrap360(num(cmd.position))
      let delta = ((target - now + 540) % 360) - 180
      if (cmd.way === 'clockwise') delta = (target - now + 360) % 360
      if (cmd.way === 'counterclockwise') delta = -((now - target + 360) % 360)
      if (delta !== 0) runMotor(runner, thread, cmd.port, Math.sign(delta), Math.abs(delta), 'degrees')
      return
    }
    case 'motorStart':
      powerMotor(runner.hub, cmd.port, (cmd.direction === 'counterclockwise' ? -1 : 1) * motorSetting(runner.hub, cmd.port))
      return
    case 'motorStop':
      powerMotor(runner.hub, cmd.port, 0)
      return
    case 'motorSetSpeed':
      setMotorSetting(runner.hub, cmd.port, num(cmd.percent))
      return
    case 'motorSetRelative':
      setRelative(runner.hub, cmd.port, num(cmd.value))
      return

    case 'call': {
      const procedure = runner.procedures[cmd.name]
      if (!procedure || thread.stack.length > 200) return

      const scope = new Map(procedure.params.map((id, i) => [id, evaluate(runner, cmd.args[i])]))
      thread.stack.push({ kind: 'call', body: procedure.body, index: 0, scope })
      return
    }
  }
}

function finished(runner, thread) {
  const active = thread.active
  if (!active) return true

  if (active.kind === 'wait' || active.kind === 'timed') {
    return runner.clock >= active.until
  }
  if (active.kind === 'distance') {
    return travelled(runner.robot, active.from) >= active.target
  }
  if (active.kind === 'until') {
    return truthy(evaluate(runner, active.cond))
  }
  if (active.kind === 'turn') {
    return Math.abs(motorAngle(runner.hub, active.port) - active.from) >= active.target
  }
  return true
}

function tick(runner, thread) {
  let budget = 10000
  runner.current = thread

  while (!thread.done && budget-- > 0) {
    if (!finished(runner, thread)) return

    const active = thread.active
    if (active?.port) {
      powerMotor(runner.hub, active.port, 0)
      if (active.kind === 'turn') snapMotor(runner.hub, active.port, active.from + active.direction * active.target)
    } else if (active?.kind === 'timed' || active?.kind === 'distance') {
      drive(runner.robot, 0, 0)
    }
    thread.active = null

    const cmd = nextStep(runner, thread)
    if (cmd === YIELD) return
    if (!cmd) {
      thread.done = true
      return
    }

    begin(runner, thread, cmd)
    if (runner.done) return
  }
}

export function advance(runner, dt) {
  if (runner.done) return

  runner.clock += dt

  for (const thread of runner.threads) {
    if (!thread.done) tick(runner, thread)
    if (runner.done) return
  }

  if (runner.threads.every((thread) => thread.done)) {
    runner.done = true
    drive(runner.robot, 0, 0)
    stopMotors(runner.hub)
  }
}