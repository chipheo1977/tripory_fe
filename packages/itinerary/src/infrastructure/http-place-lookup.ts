import type { HttpClient } from '@tripory/api-client';
import type { PlaceLookup } from '../application';
import { placeListDto, placeResultDto, toPlace } from './place-dto';

// Adapter HTTP cho `PlaceLookup`: gọi BFF của chính app (`GET /api/places/*`), không bao giờ gọi thẳng Photon hay
// Nominatim (D-143). `ApiError` (429 `Places.RateLimited`, 502 `Places.Unavailable`...) lan nguyên ra cho UI;
// body sai hình dạng thì ném.

export function createHttpPlaceLookup(http: HttpClient): PlaceLookup {
  return {
    async search({ text, destinationCode }, signal) {
      const data = await http.send({
        method: 'GET',
        path: '/places/search',
        query: { q: text, destination: destinationCode },
        signal,
      });
      return placeListDto.parse(data).places.map(toPlace);
    },

    async suggest(destinationCode, signal) {
      const data = await http.send({
        method: 'GET',
        path: '/places/suggestions',
        query: { destination: destinationCode },
        signal,
      });
      return placeListDto.parse(data).places.map(toPlace);
    },

    async reverse({ latitude, longitude }, signal) {
      const data = await http.send({
        method: 'GET',
        path: '/places/reverse',
        query: { lat: latitude, lng: longitude },
        signal,
      });
      const { place } = placeResultDto.parse(data);
      return place === null ? null : toPlace(place);
    },
  };
}
