







     document.addEventListener('DOMContentLoaded', function() {

    const textInput = document.getElementById('text-input');
    const textSizeRange = document.getElementById('text-size-range');
    const textOpacityRange = document.getElementById('text-opacity-range');
    const textColorRange = document.getElementById('text-color-range');

   
    textInput.style.fontSize = `${textSizeRange.value}px`;
    textInput.style.opacity = textOpacityRange.value;
    textInput.style.color = textColorRange.value;


    textSizeRange.addEventListener('input', function(e) {
        textInput.style.fontSize = `${e.target.value}px`;
    });


    textOpacityRange.addEventListener('input', function(e) {
        textInput.style.opacity = e.target.value;
    });

 
    textColorRange.addEventListener('input', function(e) {
        textInput.style.color = e.target.value;
    });
});


const map = L.map('map').setView([20, 0], 2);


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


document.getElementById('map-layer').addEventListener('change', (e) => {
    map.eachLayer(layer => map.removeLayer(layer));
    layers[e.target.value].addTo(map);
});


let geojsonLayer, bordersLayer;
let countriesData = {}; 
let selectedLayer = null; 

fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
    .then(res => res.json())
    .then(data => {
      
        geojsonLayer = L.geoJSON(data, {
            style: (feature) => {
                const countryName = feature.properties.ADMIN;
                const countryColor = countriesData[countryName] || "#BABABA"; 
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

      
        bordersLayer = geojsonLayer;
        bordersLayer.addTo(map); 

       
        const countrySelect = document.getElementById('country-select');
        data.features.forEach(feature => {
            const countryName = feature.properties.ADMIN;
            const option = document.createElement('option');
            option.value = countryName;
            option.textContent = countryName;
            countrySelect.appendChild(option);

           
            countriesData[countryName] = "#BABABA"; 
        });

        countrySelect.addEventListener('change', (e) => {
            selectCountry(e.target.value);
        });

       
        const showBordersCheckbox = document.getElementById('show-borders');
        showBordersCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                bordersLayer.addTo(map);
            } else {
                bordersLayer.removeFrom(map); 
            }
        });
    });


function highlightCountry(layer, countryName) {
    if (selectedLayer) geojsonLayer.resetStyle(selectedLayer); 
    selectedLayer = layer; 

   
    layer.setStyle({
        color: '#ff7800',
        weight: 3,
        fillOpacity: 0.5
    });


    document.getElementById('country-select').value = countryName;

 
    const colorPickerDiv = document.getElementById('country-color-picker');
    const colorInput = document.getElementById('country-color');
    colorInput.value = countriesData[countryName] || "#BABABA"; 
    colorPickerDiv.style.display = 'block';
}


function selectCountry(countryName) {
    geojsonLayer.eachLayer((layer) => {
        if (layer.feature.properties.ADMIN === countryName) {
            highlightCountry(layer, countryName);
            map.fitBounds(layer.getBounds()); 
        }
    });
}


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
        return {};
    });
});

const markers = [];
const pointList = document.getElementById('point-list');
const centerMapBtn = document.getElementById('center-map-btn');
const clearPointsBtn = document.getElementById('clear-points-btn');
const resetBtn = document.getElementById('reset-btn');


function updatePointList() {
    pointList.innerHTML = ''; 
    markers.forEach((markerData, index) => {
        const div = document.createElement('div');
        const { marker, description, imageUrl } = markerData;
        const latLng = marker.getLatLng(); 

        div.innerHTML = `
            <span>${description || 'Без опису'} [${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}]</span>
            <button onclick="deletePoint(${index})">Видалити</button>
            <button style="margin-top:5px;" onclick="editPoint(${index})">Редагувати</button>
        `;
        pointList.appendChild(div);
        
      
        marker.on('dragend', function() {
            updatePointList(); 
        });
    });
}


function editPoint(index) {
    const markerData = markers[index];
    const { description, imageUrl } = markerData;

  
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

            let newImage = imageUrl;

           
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    newImage = e.target.result;
                    updateMarker(index, newDescription, newImage);
                };
                reader.readAsDataURL(imageFile);
            } else {
               
                updateMarker(index, newDescription, newImage);
            }
        }
    });
}


function updateMarker(index, newDescription, newImage) {
 
    markers[index].description = newDescription;
    markers[index].imageUrl = newImage;


    const marker = markers[index].marker;
    let popupContent = `<p>${newDescription || 'Без опису'}</p>`;
    if (newImage) {
        popupContent += `<img src="${newImage}" alt="Зображення точки" style="width: 100px; height: auto;" />`;
    }

    marker.setPopupContent(popupContent);
    updatePointList();
}


function deletePoint(index) {
    map.removeLayer(markers[index].marker);
    markers.splice(index, 1);
    updatePointList();
}



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


centerMapBtn.addEventListener('click', () => {
    if (markers.length > 0) {
        const lastMarker = markers[markers.length - 1].marker;
        map.setView(lastMarker.getLatLng(), 10);
    } else {
        alert('Немає точок для центрування!');
    }
});


clearPointsBtn.addEventListener('click', () => {
    markers.forEach(item => map.removeLayer(item.marker));
    markers.length = 0;
    updatePointList();
});


resetBtn.addEventListener('click', () => {
    clearPointsBtn.click();
    document.getElementById('country-select').value = '';
    map.setView([20, 0], 2);
});


document.getElementById('save-btn').addEventListener('click', () => {
 
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
            const fio = result.value;

  
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

         
            const mapData = {
                fio: fio,
                selectedCountry: country,
                points,
                countries: countriesInfo, 
                layers: {
                    osm: layers.osm._map ? 'osm' : null,
                    satellite: layers.satellite._map ? 'satellite' : null,
                    terrain: layers.terrain._map ? 'terrain' : null
                }
            };

            const dataStr = JSON.stringify(mapData, null, 2); 

         
            const filename = `map-data-${fio.replace(/\s+/g, '_')}.json`;

        
            downloadJSON(dataStr, filename);
        }
    });
});


function downloadJSON(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);


    $('<a>')
        .attr('href', url)
        .attr('download', filename)
        .get(0)
        .click();

    URL.revokeObjectURL(url);
}


