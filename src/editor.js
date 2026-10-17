import * as Blockly from 'blockly'
import { theme, toolbox, starter } from './blocks.js'

const SAVE_KEY = 'vro:workspace'

function load(workspace) {
    let saved = null
    try {
        saved = JSON.parse(localStorage.getItem(SAVE_KEY))
    } catch (error) {
        saved = null
    }

    try {
        Blockly.serialization.workspaces.load(saved ?? starter, workspace)
    } catch (error) {
        console.warn('editor: saved program unreadable, loading starter', error)
        Blockly.serialization.workspaces.load(starter, workspace)
    }
}

function save(workspace) {
    try {
        const state = Blockly.serialization.workspaces.save(workspace)
        localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch (error) {
        console.warn('editor: could not save program', error)
    }
}

function compileStack(block) {
    const steps = []
    while (block) {
        if (block.isEnabled()) {
            const step = compileBlock(block)
            if (step) steps.push(step)
        }
        block = block.getNextBlock()
    }
    return steps
}

function compileBlock(block) {
    const field = (name) => block.getFieldValue(name)
    const number = (name) => Number(field(name))

    switch (block.type) {
        case 'vro_move':
            return { op: 'move', direction: field('DIRECTION'), amount: number('AMOUNT'), unit: field('UNIT') }
        case 'vro_move_steering':
            return { op: 'moveSteering', steering: number('STEERING'), amount: number('AMOUNT'), unit: field('UNIT') }
        case 'vro_start_moving':
            return { op: 'startMoving', direction: field('DIRECTION') }
        case 'vro_start_moving_steering':
            return { op: 'startMovingSteering', steering: number('STEERING') }
        case 'vro_stop_moving':
            return { op: 'stopMoving' }
        case 'vro_set_speed':
            return { op: 'setSpeed', percent: number('PERCENT') }
        case 'vro_set_rotation':
            return { op: 'setRotationDistance', cm: number('CM') }
        case 'vro_wait':
            return { op: 'wait', seconds: number('SECONDS') }
        case 'vro_repeat':
            return { op: 'repeat', times: number('TIMES'), body: compileStack(block.getInputTargetBlock('DO')) }
        case 'vro_forever':
            return { op: 'forever', body: compileStack(block.getInputTargetBlock('DO')) }
        default:
            return null
    }
}

export function mountEditor(element) {
    const workspace = Blockly.inject(element, {
        toolbox,
        theme,
        renderer: 'zelos',
        media: './blockly-media/',
        trashcan: true,
        zoom: { controls: true, wheel: true, startScale: 0.75 },
    })

    load(workspace)

    workspace.addChangeListener((event) => {
        if (!event.isUiEvent) save (workspace)
    })

    new ResizeObserver(() => Blockly.svgResize(workspace)).observe(element)

    return {
        program() {
            const start = workspace.getTopBlocks(true).find((block) => block.type === 'vro_start')
            if (!start) return null
            return compileStack(start.getNextBlock())
        },
    }
}