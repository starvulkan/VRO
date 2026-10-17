import * as Blockly from 'blockly'

const UNITS = [
    ['cm', 'cm'],
    ['inches', 'inches'],
    ['rotations', 'rotations'],
    ['degrees', 'degrees'],
    ['seconds', 'seconds'],
]

const DIRECTIONS = [
    ['forward', 'forward'],
    ['back', 'back'],
]

Blockly.common.defineBlocksWithJsonArray([
    {
        type: 'vro_start',
        message0: 'when program starts',
        nextStatement: null,
        style: 'vro_events',
    },
    {
        type: 'vro_move',
        message0: 'move %1 for %2 %3',
        args0: [
            { type: 'field_dropdown', name: 'DIRECTION', options: DIRECTIONS },
            { type: 'field_number', name: 'AMOUNT', value: 10, min: 0 },
            { type: 'field_dropdown', name: 'UNIT', options: UNITS },
        ],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_movement',
    },
    {
        type: 'vro_move_steering',
        message0: 'move steering %1 for %2 %3',
        args0: [
            { type: 'field_number', name: 'STEERING', value: 30, min: -100, max: 100 },
            { type: 'field_number', name: 'AMOUNT', value: 10, min: 0 },
            { type: 'field_dropdown', name: 'UNIT', options: UNITS },
        ],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_movement',
    },
    {
        type: 'vro_start_moving',
        message0: 'start moving %1',
        args0: [{ type: 'field_dropdown', name: 'DIRECTION', options: DIRECTIONS }],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_movement',
    },
    {
        type: 'vro_start_moving_steering',
        message0: 'start moving steering %1',
        args0: [{ type: 'field_number', name: 'STEERING', value: 30, min: -100, max: 100 }],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_movement',
    },
    {
        type: 'vro_stop_moving',
        message0: 'stop moving',
        previousStatement: null,
        nextStatement: null,
        style: 'vro_movement',
    },
    {
        type: 'vro_set_speed',
        message0: 'set movement speed to %1 %%',
        args0: [{ type: 'field_number', name: 'PERCENT', value: 50, min: -100, max: 100 }],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_movement',
    },
    {
        type: 'vro_set_rotation',
        message0: 'set 1 motor rotation to %1 cm moved',
        args0: [{ type: 'field_number', name: 'CM', value: 17.59, min: 0.1 }],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_movement',
    },
    {
        type: 'vro_wait',
        message0: 'wait %1 seconds',
        args0: [{ type: 'field_number', name: 'SECONDS', value: 1, min: 0 }],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_control',
    },
    {
        type: 'vro_repeat',
        message0: 'repeat %1',
        args0: [{ type: 'field_number', name: 'TIMES', value: 10, min: 0, precision: 1 }],
        message1: '%1',
        args1: [{ type: 'input_statement', name: 'DO' }],
        previousStatement: null,
        nextStatement: null,
        style: 'vro_control',
    },
    {
        type: 'vro_forever',
        message0: 'forever',
        message1: '%1',
        args1: [{ type: 'input_statement', name: 'DO' }],
        previousStatement: null,
        style: 'vro_control',
    },
])

export const theme = Blockly.Theme.defineTheme('vro', {
    base: Blockly.Themes.Classic,
    blockStyle: {
        vro_events: {
            colourPrimary: '#E6E600',
            colourSecondary: '#FFEA00',
            colourTertiary: '#ccbe00',
            hat: 'cap',
        },
        vro_movement: {
            colourPrimary: '#FF4CCD',
            colourSecondary: '#E644B8',
            colourTertiary: '#CC3DA4',
        },
        vro_control: {
            colourPrimary: '#FFAB19',
            colourSecondary: '#EC9C13',
            colourTertiary: '#CF8B17',
        },
    },
    categoryStyles: {
        vro_events: { colour: '#E6E600' },
        vro_movement: { colour: '#FF4CCD' },
        vro_control: { colour: '#FFAB19' },
    },
    componentStyles: {
        workspaceBackgroundColour: '#0B0910',
        toolboxBackgroundColour: '#18132A',
        toolboxForegroundColour: '#E8E4F2',
        flyoutBackgroundColour: '#18132A',
        flyoutForegroundColour: '#E8E4F2',
        flyoutOpacity: 1,
        scrollbarColour: '#2B2340',
        scrollbarOpacity: 1,
        insertionMarkerColour: '#FFFFFF',
        insertionMarkerOpacity: 0.3,
        cursorColour: '#A06BFF',
    },
    fontStyle: { family: 'system-ui, sans-serif', weight: '600', size: 12 },
})

export const toolbox = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: 'Events',
            categorystyle: 'vro_events',
            contents: [{ kind: 'block', type: 'vro_start' }],
        },
        {
            kind: 'category',
            name: 'Movement',
            categorystyle: 'vro_movement',
            contents: [
                { kind: 'block', type: 'vro_move' },
                { kind: 'block', type: 'vro_move_steering' },
                { kind: 'block', type: 'vro_start_moving' },
                { kind: 'block', type: 'vro_start_moving_steering' },
                { kind: 'block', type: 'vro_stop_moving' },
                { kind: 'block', type: 'vro_set_speed' },
                { kind: 'block', type: 'vro_set_rotation' },
            ],
        },
        {
            kind: 'category',
            name: 'Control',
            categorystyle: 'vro_control',
            contents: [
                { kind: 'block', type: 'vro_wait' },
                { kind: 'block', type: 'vro_repeat' },
                { kind: 'block', type: 'vro_forever' },
            ],
        },
    ],
}

// get ready for the world of brackets!!!
export const starter = {
    blocks: {
        languageVersion: 0,
        blocks: [
            {
                type: 'vro_start',
                x: 40,
                y: 40,
                next: {
                    block: {
                        type: 'vro_set_speed',
                        fields: { PERCENT: 60 },
                        next: {
                            block: {
                                type: 'vro_repeat',
                                fields: { TIMES: 4 },
                                inputs: {
                                    DO: {
                                        block: {
                                            type: 'vro_move',
                                            fields: { DIRECTION: 'forward', AMOUNT: 40, UNIT: 'cm' },
                                            next: {
                                                block: {
                                                type: 'vro_move_steering',
                                                fields: { STEERING: 100, AMOUNT: 193, UNIT: 'degrees' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        ],
    },
}

