  
        const map = L.map('map').setView([20, 0], 2); // Встановлюємо початковий центр та масштаб

  
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
        
  
        let currentLayer = layers.osm.addTo(map);
        
     
        function changeMapLayer(layer) {
            if (currentLayer) {
                map.removeLayer(currentLayer);
            }
        
            switch (layer) {
                case 'osm':
                    currentLayer = layers.osm;
                    break;
                case 'satellite':
                    currentLayer = layers.satellite;
                    break;
                case 'terrain':
                    currentLayer = layers.terrain;
                    break;
                default:
                    break;
            }
            currentLayer.addTo(map);
        }
        
    
        document.getElementById('map-layer').addEventListener('change', function(event) {
            changeMapLayer(event.target.value);
        });
        
        let countryLayer = null; // Шар для всіх країн
        let pointsLayer = null;  // Шар для точок
        
       
        let countriesGeoJSON = null;
        
  
        fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
            .then(res => res.json())
            .then(data => {
                countriesGeoJSON = data; // Зберігаємо дані про межі країн
            })
            .catch(err => {
                alert('Помилка завантаження меж країн: ' + err.message);
            });
        
  
        function loadDataFromJSON(jsonData) {
            try {
                const points = jsonData.points;
                const countryColors = jsonData.countries;
                const fio = jsonData.fio; // Отримуємо ФІО з JSON
        
                if (!countriesGeoJSON) {
                    alert("Помилка: Дані про межі країн відсутні.");
                    return;
                }
        
            
                if (countryLayer) {
                    map.removeLayer(countryLayer);
                }
                if (pointsLayer) {
                    map.removeLayer(pointsLayer);
                }
        
            
                const countryColorMap = countryColors.reduce((acc, item) => {
                    acc[item.country] = item.color;
                    return acc;
                }, {});
        
             
                countryLayer = L.geoJSON(countriesGeoJSON, {
                    style: function(feature) {
                        const countryColor = countryColorMap[feature.properties.ADMIN] || "#BABABA"; // Якщо колір не заданий, застосовуємо сірий
                        return {
                            color: countryColor,
                            weight: 2,
                            fillColor: countryColor,
                            fillOpacity: 0.5
                        };
                    }
                }).addTo(map);
        

                map.fitBounds(countryLayer.getBounds());
        
            
                pointsLayer = L.layerGroup(
                    points.map(point => {
                        const marker = L.marker([point.lat, point.lng]);
        
             
                        if (point.description || point.imageUrl) {
                            let popupContent = `<b>Координати:</b> (${point.lat.toFixed(2)}, ${point.lng.toFixed(2)})`;
        
                            if (point.description) {
                                popupContent += `<br><b>Опис:</b> ${point.description}`;
                            }
        
                            if (point.imageUrl) {
                                popupContent += `<br><img src="${point.imageUrl}" alt="Зображення" class="popup-img">`;
                            }
        
                            // Прив'язуємо вміст як спливаюче вікно
                            marker.bindPopup(popupContent, {
                                closeButton: true,
                                minWidth: 200
                            }).openPopup(); 
                        }
        
                        return marker;
                    })
                ).addTo(map);
        

                map.on('zoomend', function () {
                    const zoom = map.getZoom();
                    if (zoom >= 4) {
                        pointsLayer.eachLayer(marker => {
                            if (marker.getPopup()) {
                                marker.openPopup(); 
                            }
                        });
                    } else {
                        pointsLayer.eachLayer(marker => {
                            if (marker.getPopup()) {
                                marker.closePopup();
                            }
                        });
                    }
                });
        
            
                document.getElementById('fio-display').innerText = `Назва: ${fio || 'Невідомо'}`;
        
                alert('Дані успішно завантажені!');
            } catch (e) {
                alert("Помилка при завантаженні даних: " + e.message);
            }
        }
        
   
        document.getElementById('json-upload').addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        loadDataFromJSON(jsonData);
                    } catch (e) {
                        alert('Помилка при читанні JSON файлу: ' + e.message);
                    }
                };
                reader.readAsText(file);
            }
        });
        
