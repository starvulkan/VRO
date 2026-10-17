import './style.css'
import { MAT, makeView, loadImage } from './mat.js'
import { makeRobot, drive, step } from './robot.js'
import { makeDrivebase } from './drive.js'
import { makeRunner, advance } from './program.js'
import { mountEditor } from './editor.js'

const START = { x: 1181, y: 120, heading: Math.PI / 2 }

const editor = mountEditor(document.querySelector('#editor'))

const canvas = document.querySelector('#field')
canvas.width = 2362
canvas.height = 1143

const ctx = canvas.getContext('2d')
const view = makeView(canvas)

const runButton = document.querySelector('#run')
const stopButton = document.querySelector('#stop')
const resetButton = document.querySelector('#reset')
const statusText = document.querySelector('#status')

let robot = makeRobot(START)
let runner = null
let running = false

function show(text) {
  statusText.textContent = text
  runButton.disabled = running
  stopButton.disabled = !running
}

function run() {
  if (running) return

  const program = editor.program()
  if (!program) {
    show('Add a "when program starts" block')
    return
  }

  runner = makeRunner(robot, makeDrivebase(), program)
  running = true
  show('Running')
}

function stop(text = 'Stopped') {
  running = false
  drive(robot, 0, 0)
  show(text)
}

function reset() {
  stop('Ready')
  robot = makeRobot(START)
}

runButton.addEventListener('click', run)
stopButton.addEventListener('click', () => stop())
resetButton.addEventListener('click', reset)

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

  if (running) {
    advance(runner, dt)
    if (runner.done) stop('Finished')
  }
  step(robot, dt)

  ctx.drawImage(mat, 0, 0, canvas.width, canvas.height)
  drawRobot()

  requestAnimationFrame(frame)
}

show('Ready')
requestAnimationFrame(frame)