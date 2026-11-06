import { describe, expect, it } from 'vitest';
import * as httpApi from './infrastructure';
import * as publicApi from './index';
import * as reactApi from './react';

const missingFrom = (module: object, names: readonly string[]) => names.filter((name) => !(name in module));

const DOMAIN_NAMES = [
  'canEdit',
  'canPublish',
  'buildDayRange',
  'nextDayNumber',
  'parseCalendarDate',
  'formatCalendarDateVi',
  'parseLocationInput',
  'formatCoordinate',
  'parseStatusFilter',
  'moveItem',
  'applyDayOrder',
  'reorderWaypoints',
  'searchDestinations',
  'normalizeSearchText',
  'popularDestinations',
  'defaultTripTitle',
  'onDestinationChanged',
  'onTitleInput',
  'onTitleBlur',
  'clampDayCount',
  'isValidDayCount',
  'normalizeInterests',
  'INTERESTS',
  'POPULAR_GROUP_SIZE',
  'metadataOf',
  'withMetadata',
  'isSameMetadata',
  'COVER_IMAGE_LIMIT',
  'galleryOf',
  'canAddCoverImage',
  'addCoverImage',
  'removeCoverImage',
  'selectCoverImage',
  'coverSlots',
  'focusTargetAfterRemove',
  'VIETNAM_VIEW_BOUNDS',
  'boundsOf',
  'boundsContain',
  'isDegenerate',
  'OVERVIEW_TAB',
  'DAY_COLOR_COUNT',
  'dayColorIndex',
  'countVisibleWaypoints',
  'defaultEditorTab',
  'buildMapPins',
  'buildDayRoutes',
  'fitTargetFor',
  'summarizeDays',
  'PLACE_CATEGORY_LABELS',
  'SUGGESTION_CATEGORIES',
  'ATTRACTION_TOURISM_VALUES',
  'FOOD_AMENITY_VALUES',
  'LODGING_TOURISM_VALUES',
  'placeCategoryOf',
  'composePlaceAddress',
  'VIETNAM_SEARCH_BOUNDS',
  'HOANG_SA_BOUNDS',
  'TRUONG_SA_BOUNDS',
  'isSearchableCoordinate',
  'isPlaceAllowed',
  'PLACE_QUERY_MIN_LENGTH',
  'PLACE_QUERY_MAX_LENGTH',
  'placeQueryText',
  'coordinateInputOf',
  'planPlaceAutofill',
  'createPlaceSearchService',
] as const;

const INFRASTRUCTURE_NAMES = [
  'createHttpItineraryRepository',
  'createHttpShortLinkResolver',
  'createHttpPlaceLookup',
  'createNominatimReverseProvider',
  'createPhotonPlaceSearchProvider',
  'createStaticDestinationCatalog',
  'toItinerary',
  'itineraryDetailDto',
] as const;

const REACT_NAMES = ['createItineraryHooks', 'itineraryKeys'] as const;

describe('itinerary public entry', () => {
  it('entry gốc là module hợp lệ', () => {
    expect(typeof publicApi).toBe('object');
  });

  it('phơi domain và use case ở entry gốc', () => {
    expect(missingFrom(publicApi, DOMAIN_NAMES)).toEqual([]);
  });

  it.each([...INFRASTRUCTURE_NAMES, ...REACT_NAMES])('entry gốc không có %s', (name) => {
    expect(name in publicApi).toBe(false);
  });
});

describe('itinerary subpath ./infrastructure (@tripory/itinerary/http)', () => {
  it('có repository, resolver, mapper và schema DTO', () => {
    expect(missingFrom(httpApi, INFRASTRUCTURE_NAMES)).toEqual([]);
  });

  it('không lẫn domain hay hook React', () => {
    expect('canEdit' in httpApi).toBe(false);
    expect('createItineraryHooks' in httpApi).toBe(false);
  });
});

describe('itinerary subpath ./react (@tripory/itinerary/react)', () => {
  it('có createItineraryHooks và itineraryKeys', () => {
    expect(missingFrom(reactApi, REACT_NAMES)).toEqual([]);
  });

  it('không lẫn adapter HTTP hay domain', () => {
    expect('createHttpItineraryRepository' in reactApi).toBe(false);
    expect('canEdit' in reactApi).toBe(false);
  });
});
