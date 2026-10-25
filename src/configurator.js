import { DEVICES, FACINGS, FACING_ANGLE, freePorts, normalize } from './config.js'

const SVG = 'http://www.w3.org/2000/svg'
const REACH = 240
const SNAP = 5

const TEMPLATE = `
  <div class="config__view">
    <svg viewBox="-260 -260 520 520" aria-label="Your robot, seen from above"></svg>
    <p class="config__hint">Seen from above, front facing up. Drag parts to move them.</p>
  </div>
  <form class="config__side" autocomplete="off">
    <fieldset>
      <legend>Robot</legend>
      <label>Name <input name="name" maxlength="32" /></label>
      <label>Color <input name="color" type="color" /></label>
    </fieldset>
    <fieldset>
      <legend>Body (mm)</legend>
      <label>Length <input name="length" type="number" min="60" max="400" /></label>
      <label>Width <input name="width" type="number" min="60" max="400" /></label>
      <label>Wheel spacing <input name="track" type="number" min="40" max="400" /></label>
      <label>Wheel diameter <input name="wheel" type="number" min="20" max="120" /></label>
    </fieldset>
    <fieldset>
      <legend>Drive motors</legend>
      <label>Left wheel <select name="left"></select></label>
      <label>Right wheel <select name="right"></select></label>
    </fieldset>
    <fieldset>
      <legend>Parts</legend>
      <div class="config__add">
        <button type="button" data-add="color">+ Color</button>
        <button type="button" data-add="distance">+ Distance</button>
        <button type="button" data-add="force">+ Force</button>
        <button type="button" data-add="motor">+ Motor</button>
      </div>
      <ul class="config__parts"></ul>
    </fieldset>
    <fieldset class="config__selected" hidden>
      <legend></legend>
      <label>Port <select name="port"></select></label>
      <label>Forward (mm) <input name="x" type="number" step="5" /></label>
      <label>Left (mm) <input name="y" type="number" step="5" /></label>
      <label class="config__facing">Facing <select name="facing"></select></label>
      <button type="button" class="config__remove">Remove part</button>
    </fieldset>
  </form>
`

const NUMBERS = ['length', 'width', 'track', 'wheel']

function snap(value) {
    return Math.max(-REACH, Math.min(REACH, Math.round(value / SNAP) * SNAP))
}

function draw(tag, attributes, parent) {
    const node = document.createElementNS(SVG, tag)
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value)
    parent.append(node)
    return node
}

export function mountConfigurator(root, { robot: initial, onChange }) {
    root.innerHTML = TEMPLATE

    const svg = root.querySelector('svg')
    const form = root.querySelector('form')
    const list = root.querySelector('.config__parts')
    const details = root.querySelector('.config__selected')
    const field = (name) => form.elements.namedItem(name)

    let robot = normalize(initial)
    let selected = null
    let dragging = null

    const chosen = () => robot.devices.find((device) => device.id === selected)

    function commit() {
        robot = normalize(robot)
        render()
        onChange(robot)
    }

    function label(x, y, text, parent) {
        const node = draw('text', { x, y, class: 'config__port' }, parent)
        node.textContent = text
    }

    function drawPart(device) {
        const { size, tint, faces } = DEVICES[device.type]
        const group = draw('g', {
            transform: `translate(${-device.y} ${-device.x})`,
            class: device.id === selected ? 'config__part is-selected' : 'config__part',
            'data-id': device.id,
        }, svg)

        if (faces) {
            const angle = FACING_ANGLE[device.facing]
            const reach = size / 2 + 16
            draw('line', { x1: 0, y1: 0, x2: -Math.sin(angle) * reach, y2: -Math.cos(angle) * reach, class: 'config__aim' }, group)
        }

        const round = device.type === 'motor' ? size / 2 : 6
        draw('rect', { x: -size / 2, y: -size / 2, width: size, height: size, rx: round, fill: tint }, group)
        label(0, 0, device.port, group)
    }

    function drawRobot() {
        svg.replaceChildren()

        for (let i = -250; i <= 250; i += 50) {
            draw('line', { x1: i, y1: -260, x2: i, y2: 260, class: 'config__grid' }, svg)
            draw('line', { x1: -260, y1: i, x2: 260, y2: i, class: 'config__grid' }, svg)
        }

        const { length, width, track, wheel, color } = robot
        draw('rect', { x: -width / 2, y: -length / 2, width, height: length, rx: 14, fill: color, class: 'config__body' }, svg)
        draw('rect', { x: -width / 2, y: -length / 2, width, height: 10, rx: 4, class: 'config__front' }, svg)

        for (const [side, port] of [[-1, robot.drive.left], [1, robot.drive.right]]) {
            draw('rect', { x: (side * track) / 2 - 9, y: -wheel / 2, width: 18, height: wheel, rx: 6, class: 'config__wheel' }, svg)
            label((side * track) / 2 + side * 26, 0, port, svg)
        }

        for (const device of robot.devices) drawPart(device)
    }

    function setValue(name, value) {
        const input = field(name)
        if (document.activeElement !== input) input.value = value
    }

    function setOptions(name, values, current) {
        field(name).replaceChildren(...values.map((value) => new Option(value, value, false, value === current)))
    }

    function syncForm() {
        setValue('name', robot.name)
        setValue('color', robot.color)
        for (const name of NUMBERS) setValue(name, robot[name])
        setOptions('left', freePorts(robot, robot.drive.left), robot.drive.left)
        setOptions('right', freePorts(robot, robot.drive.right), robot.drive.right)

        list.replaceChildren(...robot.devices.map((device) => {
            const item = document.createElement('li')
            const button = document.createElement('button')
            button.type = 'button'
            button.dataset.id = device.id
            button.textContent = `${device.port} · ${DEVICES[device.type].label}`
            button.classList.toggle('is-selected', device.id === selected)
            item.append(button)
            return item
        }))

        const device = chosen()
        details.hidden = !device
        if (!device) return

        details.querySelector('legend').textContent = `${DEVICES[device.type].label} on port ${device.port}`
        setOptions('port', freePorts(robot, device.port), device.port)
        setValue('x', device.x)
        setValue('y', device.y)
        setOptions('facing', FACINGS, device.facing)
        root.querySelector('.config__facing').hidden = !DEVICES[device.type].faces
    }

    function render() {
        drawRobot()
        syncForm()
    }

    form.addEventListener('submit', (event) => event.preventDefault())
    form.addEventListener('focusout', render)

    form.addEventListener('input', (event) => {
        const { name, value } = event.target
        const device = chosen()

        if (name === 'left' || name === 'right') robot.drive[name] = value
        else if (name === 'x' || name === 'y') device[name] = Number(value)
        else if (name === 'port' || name === 'facing') device[name] = value
        else robot[name] = NUMBERS.includes(name) ? Number(value) : value

        commit()
    })

    function addPart(type) {
        const [port] = freePorts(robot)
        if (!port) {
            window.alert('All six ports are in use. Remove a part first.')
            return
        }

        const id = Math.max(0, ...robot.devices.map((device) => device.id)) + 1
        const x = type === 'motor' ? snap(-robot.length / 4) : snap(robot.length / 2)
        robot.devices.push({ id, type, port, x, y: 0, facing: 'front' })
        selected = id
        commit()
    }

    form.addEventListener('click', (event) => {
        const add = event.target.closest('[data-add]')
        const pick = event.target.closest('.config__parts [data-id]')

        if (add) {
            addPart(add.dataset.add)
        } else if (pick) {
            selected = Number(pick.dataset.id)
            render()
        } else if (event.target.closest('.config__remove')) {
            robot.devices = robot.devices.filter((device) => device.id !== selected)
            selected = null
            commit()
        }
    })

    function toRobot(event) {
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse())
        return { x: snap(-point.y), y: snap(-point.x) }
    }

    svg.addEventListener('pointerdown', (event) => {
        const part = event.target.closest('.config__part')
        selected = part ? Number(part.dataset.id) : null
        if (part) {
            dragging = event.pointerId
            svg.setPointerCapture(event.pointerId)
        }
        render()
    })

    svg.addEventListener('pointermove', (event) => {
        if (dragging !== event.pointerId) return
        Object.assign(chosen(), toRobot(event))
        render()
        onChange(robot)
    })

    function release(event) {
        if (dragging !== event.pointerId) return
        dragging = null
        commit()
    }

    svg.addEventListener('pointerup', release)
    svg.addEventListener('pointercancel', release)

    render()

    return {
        set(next) {
            robot = normalize(next)
            selected = null
            render()
        },
    }
}

