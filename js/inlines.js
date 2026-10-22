// inline images picked from the user's computer, kept in memory while the page is open
export const images = [];

export const findImage = id => images.find(image => image.id === id);

function nextId() {
    return images.reduce((max, image) => Math.max(max, image.id), 0) + 1;
}

// returns how many of the files were skipped for not being images
export function addImages(files) {
    let skipped = 0;

    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            skipped++;
            continue;
        }

        images.push({
            id: nextId(),
            name: file.name.replace(/\.[^.]+$/, ''),
            url: URL.createObjectURL(file),
        });
    }

    images.sort((a, b) => a.id - b.id);
    return skipped;
}

// false if the id is not a whole number or another image already has it
export function setImageId(image, id) {
    if (!Number.isInteger(id) || id < 0) return false;

    const other = findImage(id);
    if (other && other !== image) return false;

    image.id = id;
    images.sort((a, b) => a.id - b.id);
    return true;
}

export function removeImage(image) {
    URL.revokeObjectURL(image.url);
    images.splice(images.indexOf(image), 1);
}
