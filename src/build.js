import { MAT, makeView, loadImage } from './mat.js'
import { makeRobot, drive, step } from './robot.js'
import { makeDrivebase } from './drive.js'
import { makeRunner, advance } from './program.js'
import { mountEditor } from './editor.js'
import { UNTITLED, blank, unpack, saveFile, openFile } from './files.js'
import { DEVICES, FACING_ANGLE, normalize, geometry, circumference } from './config.js'
import { mountConfigurator } from './configurator.js'

const START = { x: 1181, y: 160, heading: Math.PI / 2 }
const FILE_KEY = 'vro:file'
const ROBOT_KEY = 'vro:robot'

export async function mountBuild(root) {
  const $ = (selector) => root.querySelector(selector)

  const editor = mountEditor($('#editor'))

  const canvas = $('#field')
  canvas.width = 2362
  canvas.height = 1143

  const ctx = canvas.getContext('2d')
  const view = makeView(canvas)

  const runButton = $('#run')
  const stopButton = $('#stop')
  const resetButton = $('#reset')
  const newButton = $('#new')
  const openButton = $('#open')
  const saveButton = $('#save')
  const saveAsButton = $('#save-as')
  const fileText = $('#file')
  const statusText = $('#status')

  function loadRobot() {
    try {
      return normalize(JSON.parse(localStorage.getItem(ROBOT_KEY)))
    } catch (error) {
      return normalize(null)
    }
  }

  let config = loadRobot()
  let robot = makeRobot({ ...START, ...geometry(config) })
  let runner = null
  let running = false
  let active = false
  let raf = 0

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

    runner = makeRunner(robot, makeDrivebase({ circumference: circumference(config) }), program)
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
    robot = makeRobot({ ...START, ...geometry(config) })
  }

  runButton.addEventListener('click', run)
  stopButton.addEventListener('click', () => stop())
  resetButton.addEventListener('click', reset)

  function useRobot(next) {
    config = next
    try {
      localStorage.setItem(ROBOT_KEY, JSON.stringify(config))
    } catch (error) {
      console.warn('robot: could not remember the robot', error)
    }
    if (!running) robot = makeRobot({ x: robot.x, y: robot.y, heading: robot.heading, ...geometry(config) })
  }

  const configurator = mountConfigurator($('#robot-panel'), {
    robot: config,
    onChange(next) {
        useRobot(next)
        showFile()
    },
  })

  const tabs = { program: $('#tab-program'), robot: $('#tab-robot') }

  function showTab(name) {
    $('#editor').hidden = name !== 'program'
    $('#robot-panel').hidden = name !== 'robot'
    for (const [key, tab] of Object.entries(tabs)) tab.classList.toggle('is-on', key === name)
  }

  tabs.program.addEventListener('click', () => showTab('program'))
  tabs.robot.addEventListener('click', () => showTab('robot'))


  const project = () => ({ workspace: editor.state(), robot: config })
  const current = () => JSON.stringify(project())

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
      const opened = unpack(picked.text)
      editor.replace(opened.workspace)
      if (opened.robot) {
        useRobot(normalize(opened.robot))
        configurator.set(config)
      }
      reset()
      settle(picked.name, picked.handle)
    } catch (error) {
      window.alert(error.message)
    }
  }

  async function saveProgram(as = false) {
    try {
      const saved = await saveFile(project(), { name: file.name, handle: file.handle, as })
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
    if (!active || !(event.metaKey || event.ctrlKey)) return
    const key = event.key.toLowerCase()

    if (key === 's') {
      event.preventDefault()
      saveProgram(event.shiftKey)
    } else if (key === 'o') {
      event.preventDefault()
      openProgram()
    }
  })

  const mat = await loadImage(MAT.image)

  function drawRobot() {
    const [sx, sy] = view.toScreen(robot.x, robot.y)
    const s = view.scale
    const w = robot.width * s
    const l = robot.length * s

    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(-robot.heading)

    ctx.globalAlpha = 0.85
    ctx.fillStyle = config.color
    ctx.fillRect(-l / 2, -w / 2, l, w)
    ctx.globalAlpha = 1

    ctx.fillStyle = '#FF3D9A'
    ctx.fillRect(l / 2 - 8 * s, -w / 2, 8 * s, w)

    ctx.fillStyle = '#16121F'
    for (const side of [-1, 1]) {
      ctx.fillRect((-config.wheel / 2) * s, (side * config.track) / 2 * s - 9 * s, config.wheel * s, 18 * s)
    }

    for (const device of config.devices) {
      const { size, tint, faces } = DEVICES[device.type]
      const x = device.x * s
      const y = -device.y * s

      if (faces) {
        const angle = FACING_ANGLE[device.facing]
        const reach = (size / 2 + 16) * s
        ctx.strokeStyle = tint
        ctx.lineWidth = 4 * s
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(angle) * reach, y - Math.sin(angle) * reach)
        ctx.stroke()
      }

      ctx.fillStyle = tint
      ctx.fillRect(x - (size / 2) * s, y - (size / 2) * s, size * s, size * s)
    }

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

    raf = requestAnimationFrame(frame)
  }

  show('Ready')

  return {
    enter() {
        active = true
        showFile()
        last = performance.now()
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(frame)
    },

    leave() {
        active = false
        cancelAnimationFrame(raf)
        if (running) stop()
    },
  }
}