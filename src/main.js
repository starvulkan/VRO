import './style.css'
import { MAT, makeView, loadImage } from './mat.js'
import { makeRobot, step } from './robot.js'
import { makeDrivebase } from './drive.js'
import { makeRunner, advance } from './program.js'

const canvas = document.querySelector('#field')
canvas.width = 2362
canvas.height = 1143

const ctx = canvas.getContext('2d')
const view = makeView(canvas)

const robot = makeRobot({ x: 1181, y: 120, heading: Math.PI / 2 })
const base = makeDrivebase()

const program = [
  { op: 'setSpeed', percent: 60 },
  {
    op: 'repeat',
    times: 4,
    body: [
      { op: 'move', amount: 40, unit: 'cm' },
      { op: 'moveSteering', amount: 90, unit: 'degrees', steering: 100 },
    ],
  },
]

const runner = makeRunner(robot, base, program)

const mat = await loadImage(MAT.image)

function drawRobot() {
  const [sx, sy] = view.toScreen(robot.x, robot.y)
  const w = robot.width * view.scale
  const l = robot.length * view.scale

  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(-robot.heading)

  ctx.fillStyle = 'rgba(160, 107, 255, 0.85)'
  ctx.fillRect(-l / 2, -w / 2, l, w)

  ctx.fillStyle = '#FF3D9A'
  ctx.fillRect(l / 2 - 8 * view.scale, -w / 2, 8 * view.scale, w)

  ctx.restore()
}

let last = performance.now()

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now

  advance(runner, dt)
  step(robot, dt)

  ctx.drawImage(mat, 0, 0, canvas.width, canvas.height)
  drawRobot()

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)