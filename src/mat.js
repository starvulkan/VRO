export const MAT = {
    name: 'Rays of Light',
    image: './mats/rays-of-light.png',
    width: 2362,
    height: 1143,
}

export function makeView(canvas, mat = MAT) {
    const scale = canvas.width / mat.width
    return {
        scale,
        toScreen(x, y) {
            return [x * scale, (mat.height - y) * scale]
        },
        toWorld(sx, sy) {
            return [sx / scale, mat.height - sy / scale]
        },
    }
}

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`could not load ${src}`))
        img.src = src
    })
}