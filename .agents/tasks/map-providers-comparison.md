# So sánh nền tảng bản đồ cho Tripory (bản tóm gọn)

Ngày tra cứu: 2026-11-05. Giá là USD cho mỗi 1.000 lượt, lấy từ trang pricing chính thức. "chưa kiểm" nghĩa là chưa xác minh được.

## Bảng so sánh

| Lựa chọn | Nguồn POI | POI ở Việt Nam | Hoàng Sa/Trường Sa | Gói miễn phí | Giá khi vượt | Cần thẻ | Được lưu POI vào DB |
|---|---|---|---|---|---|---|---|
| MapLibre (BSD-3) + OpenFreeMap | OSM, tìm qua Nominatim/Photon | Đủ cho điểm nổi tiếng, yếu khi tìm theo loại (thử "khách sạn Sa Pa" trên Photon ra khách sạn ở HCM, Hà Nội). Đã theo tỉnh mới (Phú Quốc thuộc An Giang) | Rủi ro: dữ liệu OSM ghi Paracel Islands thuộc Hainan, China. Phải tự sửa nhãn và ranh giới trong style, lọc kết quả geocode | Không giới hạn, không key, cho phép thương mại, không SLA | Không có (miễn phí) | Không | Có (ODbL, phải ghi công OSM) |
| MapLibre + MapTiler | OSM (MapTiler Geocoding) | Như OSM | Như OSM. Có tính năng tùy chỉnh ranh giới tranh chấp, chưa kiểm có VN | Free chỉ dùng phi thương mại. 5.000 session + 100.000 request/tháng chỉ thấy ở bên thứ ba (chưa kiểm). Hết quota thì dừng | Flex 30 USD/tháng | Free không cần | Chưa kiểm |
| Mapbox GL JS (giấy phép riêng) | Mapbox Search/Geocoding | Chưa kiểm | Có worldview `VN` và ngôn ngữ `vi` | 50.000 map load web; 50.000 ảnh tĩnh; 100.000 geocode tạm thời; 500 session Search Box | Chưa kiểm (bên thứ ba ghi khoảng 5 USD/1.000 map load) | Có, để dùng gói miễn phí đầy đủ (không thẻ chỉ được demo trial) | Mặc định không. Phải dùng Permanent Geocoding (liên hệ sales) |
| Google Maps JS + Places (New) | Google | Tốt nhất (chưa kiểm số liệu) | Có tham số `region` để đổi tile theo luật nước sở tại; hiển thị thực tế với `region=VN` chưa kiểm | 10.000/SKU/tháng: Dynamic Maps, Static Maps, Autocomplete, Geocoding, Place Details Essentials. Autocomplete Session miễn phí | Dynamic 7; Static 2; Autocomplete 2,83; Geocoding 5; Place Details 5 | Có (tài khoản billing) | Places: chỉ lưu place_id lâu dài, tọa độ tối đa 30 ngày. Cấm dùng trên bản đồ không phải Google |
| Goong | Goong (dữ liệu VN) | Tự quảng cáo tốt hơn Google ở VN (chưa kiểm) | Chưa kiểm (nhà cung cấp VN, khả năng cao là đúng) | 0 USD/tháng; tặng 100 USD khi đăng ký | Map load 3; Autocomplete 1,4; Place Detail 7; Static 1; Reverse 1,5 | Trả trước vào tài khoản (chưa kiểm cách nạp) | Chưa kiểm |
| Vietmap | Vietmap (dữ liệu VN từ 2006) | Chưa kiểm | Tự nhận phù hợp yếu tố nhạy cảm địa chính trị VN | Dùng thử 2 tháng | 50 VNĐ/transaction (25 request tile = 1 transaction) | Chưa kiểm | Chưa kiểm |
| Leaflet (BSD-2) + tile OSM | OSM | Như OSM | Như OSM, tile raster nên không sửa nhãn được | Có, nhưng không SLA, có thể bị chặn khi dùng nhiều | Không có | Không | Có (ODbL) |
| SVG hiện có | Không | Không | Không vẽ biển đảo nên không có rủi ro | Miễn phí | Không có | Không | Không áp dụng |

Ghi chú tích hợp: `react-map-gl` 8.1.3 (MIT) hỗ trợ maplibre-gl và mapbox-gl. `@vis.gl/react-google-maps` 1.10.2 hỗ trợ React 19. MapLibre v6 cần `setWorkerUrl`; docs MapLibre có hướng dẫn riêng cho Next.js 15+ với Turbopack. SDK React của Goong cũ (peer React 18, cập nhật 2022). SDK web của Vietmap dựng trên MapLibre. Bundle gzip: maplibre-gl khoảng 239 KB, mapbox-gl khoảng 508 KB, leaflet khoảng 42 KB (đo trên bundlephobia).

Pháp lý: Luật Đo đạc và bản đồ 2018 cấm xuất bản, phát hành sản phẩm bản đồ có thông tin sai về chủ quyền quốc gia. Điều này đã đối chiếu qua bản tóm tắt của Vietnam Law Magazine, chưa đọc nguyên văn điều luật. Mức phạt cụ thể chưa kiểm. Sự cố AccuWeather tháng 11/2026 cho thấy quy định đang được thực thi.

## Khuyến nghị

- **PUB-02/PUB-06 (chỉ hiển thị):** dùng MapLibre + `react-map-gl/maplibre` với OpenFreeMap. Chi phí 0, không key, không cần BFF. Bắt buộc dùng style riêng: nhãn lấy `name:vi`, ẩn ranh giới tranh chấp trên biển, thêm lớp nhãn "Quần đảo Hoàng Sa (Việt Nam)" và "Quần đảo Trường Sa (Việt Nam)". Cách khác là luôn giới hạn khung nhìn ở vùng có waypoint. Phải kiểm bằng mắt trước khi phát hành. Ảnh Open Graph: tự vẽ bằng `ImageResponse` (SVG polyline, không tile) để tránh rủi ro biển đảo.
- **v2 MAP-01/MAP-02 (tìm POI, bấm chọn vị trí):** gọi Goong qua BFF (key không ra client). POI Việt Nam tốt, giá thấp, có 100 USD tặng khi đăng ký. Cần đọc điều khoản lưu dữ liệu và việc hiển thị POI trên bản đồ không phải Goong trước khi chốt. Phương án dự phòng 0 đồng là Photon/Nominatim, phải lọc kết quả ở Hoàng Sa/Trường Sa. Không dùng Google Places vì cấm hiển thị trên bản đồ khác và không cho lưu tọa độ.
- Vì MapLibre là lớp hiển thị chung, có thể đổi nguồn tile sang Goong, Vietmap hoặc MapTiler sau này mà không viết lại component.

## Nguồn (tra ngày 2026-11-05)

- https://openfreemap.org/
- https://www.maptiler.com/cloud/pricing/
- https://auth.maptiler.com/terms/cloud/
- https://docs.maptiler.com/guides/map-design/worldview/borders/
- https://www.mapbox.com/pricing
- https://docs.mapbox.com/accounts/guides/signup/
- https://docs.mapbox.com/help/dive-deeper/maps-internationalization/
- https://docs.mapbox.com/api/search/geocoding/
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://cloud.google.com/maps-platform/terms/maps-service-terms
- https://developers.google.com/maps/documentation/javascript/localization
- https://goong.io/pricing
- https://maps.vietmap.vn/
- https://tools.vietmap.vn/playground/en/tilemap
- https://operations.osmfoundation.org/policies/tiles/
- https://docs.stadiamaps.com/limits/
- https://photon.komoot.io/api/?q=Paracel%20Islands&lang=en
- https://maplibre.org/maplibre-gl-js/docs/
- https://visgl.github.io/react-map-gl/docs/get-started
- https://vietnamlawmagazine.vn/new-law-on-topography-and-cartography-6342.html
- https://www.vietnam.vn/en/ung-dung-thoi-tiet-accuweather-vi-pham-chu-quyen-bien-dao-viet-nam
