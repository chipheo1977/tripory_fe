// Ghi công dữ liệu địa điểm ngay dưới danh sách kết quả (chính sách Photon/Nominatim, ODbL; D-142).
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

export function PlaceAttribution({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) return null;
  return (
    <p className="px-inline-sm text-label text-muted">
      Dữ liệu địa điểm{" "}
      <a
        className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        href={OSM_COPYRIGHT_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        © OpenStreetMap
      </a>
    </p>
  );
}
