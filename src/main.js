import './style.css'
import { MAT, makeView, loadImage } from './mat.js'
import { makeRobot, drive, step } from './robot.js'
import { makeDrivebase } from './drive.js'
import { makeRunner, advance } from './program.js'
import { mountEditor } from './editor.js'
import { UNTITLED, blank, unpack, saveFile, openFile } from './files.js'

const START = { x: 1181, y: 160, heading: Math.PI / 2 }
const FILE_KEY = 'vro:file'

const editor = mountEditor(document.querySelector('#editor'))

const canvas = document.querySelector('#field')
canvas.width = 2362
canvas.height = 1143

const ctx = canvas.getContext('2d')
const view = makeView(canvas)

const runButton = document.querySelector('#run')
const stopButton = document.querySelector('#stop')
const resetButton = document.querySelector('#reset')
const newButton = document.querySelector('#new')
const openButton = document.querySelector('#open')
const saveButton = document.querySelector('#save')
const saveAsButton = document.querySelector('#save-as')
const fileText = document.querySelector('#file')
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

const current = () => JSON.stringify(editor.state())

function recall() {
  try {
    return JSON.parse(localStorage.getItem(FILE_KEY))
  } catch (error) {
    return null
  }
}

let file = { name: UNTITLED, handle: null, snapshot: current(), ...recall() }

function remember() {
  try {
    localStorage.setItem(FILE_KEY, JSON.stringify({ name: file.name, snapshot: file.snapshot }))
  } catch (error) {
    console.warn('files: could not remember the open file', error)
  }
}

function dirty() {
  return current() !== file.snapshot
}

function showFile() {
  const mark = dirty() ? ' •' : ''
  fileText.textContent = `${file.name}.vro${mark}`
  document.title = `${file.name}${mark} — VRO`
}

function settle(name, handle) {
  file = { name, handle, snapshot: current() }
  remember()
  showFile()
}

function discardOk() {
  return !dirty() || window.confirm(`Discard unsaved changes to ${file.name}.vro?`)
}

function newProgram() {
  if (!discardOk()) return
  reset()
  editor.replace(blank)
  settle(UNTITLED, null)
}

async function openProgram() {
  if (!discardOk()) return
  try {
    const picked = await openFile()
    if (!picked) return
    editor.replace(unpack(picked.text))
    reset()
    settle(picked.name, picked.handle)
  } catch (error) {
    window.alert(error.message)
  }
}

async function saveProgram(as = false) {
  try {
    const saved = await saveFile(editor.state(), { name: file.name, handle: file.handle, as })
    if (saved) settle(saved.name, saved.handle)
  } catch (error) {
    window.alert(`Could not save: ${error.message}`)
  }
}

newButton.addEventListener('click', newProgram)
openButton.addEventListener('click', openProgram)
saveButton.addEventListener('click', () => saveProgram())
saveAsButton.addEventListener('click', () => saveProgram(true))
editor.onChange(showFile)

window.addEventListener('keydown', (event) => {
  if (!(event.metaKey || event.ctrlKey)) return
  const key = event.key.toLowerCase()

  if (key === 's') {
    event.preventDefault()
    saveProgram(event.shiftKey)
  } else if (key === 'o') {
    event.preventDefault()
    openProgram()
  }
})

showFile()

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