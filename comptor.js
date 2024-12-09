







     document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы
    const textInput = document.getElementById('text-input');
    const textSizeRange = document.getElementById('text-size-range');
    const textOpacityRange = document.getElementById('text-opacity-range');
    const textColorRange = document.getElementById('text-color-range');

    // Инициализируем стили для текста
    textInput.style.fontSize = `${textSizeRange.value}px`;
    textInput.style.opacity = textOpacityRange.value;
    textInput.style.color = textColorRange.value;

    // Обработчик изменения размера текста
    textSizeRange.addEventListener('input', function(e) {
        textInput.style.fontSize = `${e.target.value}px`;
    });

    // Обработчик изменения прозрачности текста
    textOpacityRange.addEventListener('input', function(e) {
        textInput.style.opacity = e.target.value;
    });

    // Обработчик изменения цвета текста
    textColorRange.addEventListener('input', function(e) {
        textInput.style.color = e.target.value;
    });
});

// === Инициализация карты ===
const map = L.map('map').setView([20, 0], 2);

// Слои карты
const layers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }),
    satellite: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 19,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google'
    }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenTopoMap contributors'
    }),
};

layers.osm.addTo(map);

// === Переключение слоев карты ===
document.getElementById('map-layer').addEventListener('change', (e) => {
    map.eachLayer(layer => map.removeLayer(layer));
    layers[e.target.value].addTo(map);
});

// Переменная для слоя границ
let geojsonLayer, bordersLayer;
let countriesData = {}; // Объект для хранения данных стран с их цветами
let selectedLayer = null; // Переменная для хранения выбранной страны

fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
    .then(res => res.json())
    .then(data => {
        // Создание слоя с границами стран
        geojsonLayer = L.geoJSON(data, {
            style: (feature) => {
                const countryName = feature.properties.ADMIN;
                const countryColor = countriesData[countryName] || "#BABABA"; // Цвет по умолчанию (серый)
                return {
                    color: countryColor,
                    weight: 1,
                    fillOpacity: 0.2
                };
            },
            onEachFeature: (feature, layer) => {
                layer.on({
                    click: () => {
                        highlightCountry(layer, feature.properties.ADMIN);
                    }
                });
            }
        });

        // Слой с границами стран (изначально скрыт)
        bordersLayer = geojsonLayer;
        bordersLayer.addTo(map); // Добавляем слой на карту

        // Заполнение списка стран в выпадающем списке
        const countrySelect = document.getElementById('country-select');
        data.features.forEach(feature => {
            const countryName = feature.properties.ADMIN;
            const option = document.createElement('option');
            option.value = countryName;
            option.textContent = countryName;
            countrySelect.appendChild(option);

            // Инициализация объекта для хранения цвета для каждой страны
            countriesData[countryName] = "#BABABA"; // Устанавливаем дефолтный серый цвет
        });

        countrySelect.addEventListener('change', (e) => {
            selectCountry(e.target.value);
        });

        // Обработчик для кнопки "Показати межі країн"
        const showBordersCheckbox = document.getElementById('show-borders');
        showBordersCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                bordersLayer.addTo(map); // Добавить слой границ
            } else {
                bordersLayer.removeFrom(map); // Убрать слой границ
            }
        });
    });

// Функция для подсветки выбранной страны при клике
function highlightCountry(layer, countryName) {
    if (selectedLayer) geojsonLayer.resetStyle(selectedLayer); // Сбросить стиль предыдущей страны
    selectedLayer = layer; // Сохраняем текущий слой как выбранный

    // Подсвечиваем выбранную страну
    layer.setStyle({
        color: '#ff7800',
        weight: 3,
        fillOpacity: 0.5
    });

    // Устанавливаем выбранную страну в выпадающем списке
    document.getElementById('country-select').value = countryName;

    // Отображаем окно выбора цвета
    const colorPickerDiv = document.getElementById('country-color-picker');
    const colorInput = document.getElementById('country-color');
    colorInput.value = countriesData[countryName] || "#BABABA"; // Устанавливаем текущий цвет страны
    colorPickerDiv.style.display = 'block'; // Показываем окно с цветом
}

// Функция для обработки выбора страны из выпадающего списка
function selectCountry(countryName) {
    geojsonLayer.eachLayer((layer) => {
        if (layer.feature.properties.ADMIN === countryName) {
            highlightCountry(layer, countryName); // Подсветить выбранную страну
            map.fitBounds(layer.getBounds()); // Масштабируем карту, чтобы страна была видна
        }
    });
}

// Обработчик для выбора нового цвета
document.getElementById('country-color').addEventListener('input', (e) => {
    const countryName = document.getElementById('country-select').value;
    const selectedColor = e.target.value;

    countriesData[countryName] = selectedColor;

    geojsonLayer.setStyle((feature) => {
        if (feature.properties.ADMIN === countryName) {
            return {
                color: selectedColor,
                weight: 1,
                fillOpacity: 0.2
            };
        }
        return {}; // Для других стран не меняем стиль
    });
});
// === Управление точками ===
const markers = [];
const pointList = document.getElementById('point-list');
const centerMapBtn = document.getElementById('center-map-btn');
const clearPointsBtn = document.getElementById('clear-points-btn');
const resetBtn = document.getElementById('reset-btn');

// Обновление списка точек
function updatePointList() {
    pointList.innerHTML = ''; // Очищаем текущий список точек
    markers.forEach((markerData, index) => {
        const div = document.createElement('div');
        const { marker, description, imageUrl } = markerData;
        const latLng = marker.getLatLng(); // Получаем координаты маркера

        div.innerHTML = `
            <span>${description || 'Без опису'} [${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}]</span>
            <button onclick="deletePoint(${index})">Видалити</button>
            <button style="margin-top:5px;" onclick="editPoint(${index})">Редагувати</button>
        `;
        pointList.appendChild(div);
        
        // Добавляем обработчик для обновления списка точек при перетаскивании маркера
        marker.on('dragend', function() {
            updatePointList(); // Перезапускаем обновление списка после перемещения
        });
    });
}

// Функция для редактирования точки
function editPoint(index) {
    const markerData = markers[index];
    const { description, imageUrl } = markerData;

    // Всплывающее окно SweetAlert для редактирования
    Swal.fire({
        title: 'Редагувати точку',
        html: `
            <input id="swal-description" class="swal2-input" placeholder="Опис" value="${description || ''}">
            <input type="file" id="swal-image-file" class="swal2-input" accept="image/*">
        `,
        showCancelButton: true,
        confirmButtonText: 'Зберегти',
        cancelButtonText: 'Відміна',
        preConfirm: () => {
            const newDescription = document.getElementById('swal-description').value;
            const imageFile = document.getElementById('swal-image-file').files[0];

            let newImage = imageUrl; // Если изображения не было выбрано, сохраняем текущее

            // Если файл изображения был выбран, читаем его
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    newImage = e.target.result; // Получаем результат загрузки файла
                    updateMarker(index, newDescription, newImage); // Обновляем маркер с изображением
                };
                reader.readAsDataURL(imageFile);
            } else {
                // Если файла не было, просто обновляем маркер с описанием
                updateMarker(index, newDescription, newImage);
            }
        }
    });
}

// Функция для обновления маркера
function updateMarker(index, newDescription, newImage) {
    // Обновляем описание и изображение маркера
    markers[index].description = newDescription;
    markers[index].imageUrl = newImage;

    // Обновляем содержимое всплывающего окна маркера
    const marker = markers[index].marker;
    let popupContent = `<p>${newDescription || 'Без опису'}</p>`;
    if (newImage) {
        popupContent += `<img src="${newImage}" alt="Зображення точки" style="width: 100px; height: auto;" />`;
    }

    marker.setPopupContent(popupContent);
    updatePointList(); // Перезапускаем обновление списка точек
}

// Удаление точки
function deletePoint(index) {
    map.removeLayer(markers[index].marker);
    markers.splice(index, 1);
    updatePointList();
}


// Добавление точки
document.getElementById('add-point-btn').addEventListener('click', () => {
    const description = document.getElementById('point-description').value.trim();
    const imageInput = document.getElementById('point-image');
    let imageUrl = null;

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            imageUrl = e.target.result;
            addMarker(description, imageUrl);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        addMarker(description, imageUrl);
    }
});

// Додати маркер з зображенням
function addMarker(description, imageUrl) {
    const marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
    marker.description = description;

    if (imageUrl) {
        const popupContent = `
            <p>${description || 'Без опису'}</p>
            <img src="${imageUrl}" alt="Зображення точки" style="width: 100px; height: auto;" />
        `;
        marker.bindPopup(popupContent).openPopup();
    } else {
        marker.bindPopup(description || 'Без опису').openPopup();
    }

    markers.push({ marker, description, imageUrl });
    updatePointList();

    document.getElementById('point-description').value = '';
    document.getElementById('point-image').value = '';
}

// Центрировать карту на последней добавленной точке
centerMapBtn.addEventListener('click', () => {
    if (markers.length > 0) {
        const lastMarker = markers[markers.length - 1].marker;
        map.setView(lastMarker.getLatLng(), 10);
    } else {
        alert('Немає точок для центрування!');
    }
});

// Удалить все точки
clearPointsBtn.addEventListener('click', () => {
    markers.forEach(item => map.removeLayer(item.marker));
    markers.length = 0;
    updatePointList();
});

// Сбросить всё
resetBtn.addEventListener('click', () => {
    clearPointsBtn.click();
    document.getElementById('country-select').value = '';
    map.setView([20, 0], 2);
});

// === Збереження даних ===
document.getElementById('save-btn').addEventListener('click', () => {
    // Показуємо вікно для введення ФІО
    Swal.fire({
        title: 'Введіть назву карти',
        input: 'text',
        inputPlaceholder: 'Введіть назву',
        showCancelButton: true,
        confirmButtonText: 'Зберегти',
        cancelButtonText: 'Скасувати',
        preConfirm: (fio) => {
            if (!fio) {
                Swal.showValidationMessage('назва не може бути порожнім!');
            }
            return fio;
        }
    }).then(result => {
        if (result.isConfirmed && result.value) {
            const fio = result.value; // Отримуємо введене ФІО

            // Вибір країни та маркерів
            const country = document.getElementById('country-select').value;
            const points = markers.map(marker => ({
                lat: marker.marker.getLatLng().lat,
                lng: marker.marker.getLatLng().lng,
                description: marker.description || '',
                imageUrl: marker.imageUrl || null
            }));

            const countriesInfo = Object.keys(countriesData).map(countryName => ({
                country: countryName,
                color: countriesData[countryName]
            }));

            // Дані карти, включаючи ФІО, вибрані країни, маркери та кольори
            const mapData = {
                fio: fio, // Додаємо ФІО
                selectedCountry: country,
                points, // Збереження маркерів
                countries: countriesInfo, // Збереження кольорів країн
                layers: {
                    osm: layers.osm._map ? 'osm' : null,
                    satellite: layers.satellite._map ? 'satellite' : null,
                    terrain: layers.terrain._map ? 'terrain' : null
                }
            };

            const dataStr = JSON.stringify(mapData, null, 2); // Перетворюємо дані в JSON рядок з відступами

            // Створюємо назву файлу з урахуванням ФІО
            const filename = `map-data-${fio.replace(/\s+/g, '_')}.json`;

            // Функція для завантаження JSON
            downloadJSON(dataStr, filename);
        }
    });
});

// Функція для завантаження JSON файлу з використанням jQuery
function downloadJSON(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Використовуємо jQuery для створення посилання та симуляції кліку
    $('<a>')
        .attr('href', url)
        .attr('download', filename)
        .get(0)
        .click();

    URL.revokeObjectURL(url);
}


