import { test, expect } from 'playwright/test';
import { parseIslandUrl, islandHref, isIslandHash } from '../../src/lib/island/navigation';
import { parsePreferences, resolvePresentation, defaultPreferences } from '../../src/lib/island/preferences';

const ids = ['maison-sol', 'veyli-colour', 'cuddy'];
for (const [hash, destination, section] of [
  ['', 'home', null], ['#top', 'home', null], ['#home', 'home', null],
  ['#work', 'work', null], ['#frontend', 'work', null], ['#about', 'about', null],
  ['#ai', 'about', 'ai'], ['#skills', 'about', 'skills'],
  ['#experience', 'experience', null], ['#contact', 'contact', null],
] as const) {
  test(`URL authority maps ${hash || 'empty'} to ${destination}`, () => {
    expect(parseIslandUrl(`https://example.test/fr/${hash}`, ids)).toEqual({
      destination, sector: 'all', projectId: null, aboutSection: section,
    });
  });
}
test('valid project/filter routes round trip without independent selected state', () => {
  const state = parseIslandUrl('https://example.test/?sector=beauty#project-veyli-colour', ids);
  expect(state).toEqual({ destination:'work',sector:'beauty',projectId:'veyli-colour',aboutSection:null });
  expect(parseIslandUrl(new URL(islandHref(state),'https://example.test/'),ids)).toEqual(state);
  expect(isIslandHash('#project-veyli-colour',ids)).toBe(true);
});
test('unknown or malformed URL input cannot select arbitrary projects or sectors', () => {
  for (const hash of ['#project-missing','#project-%E0%A4%A','#nonsense','#constructor','#__proto__']) {
    expect(parseIslandUrl(`https://example.test/?sector=unsafe${hash}`,ids)).toEqual({destination:'home',sector:'all',projectId:null,aboutSection:null});
    expect(isIslandHash(hash,ids)).toBe(false);
  }
  expect(parseIslandUrl('https://example.test/?sector=beauty#about',ids).sector).toBe('all');
});
test('preferences decode only the bounded versioned non-sensitive schema', () => {
  expect(parsePreferences(JSON.stringify({version:1,view:'3d',motion:'off'}))).toEqual({version:1,view:'3d',motion:'off'});
  for (const value of ['{bad',JSON.stringify({version:2,view:'3d',motion:'off'}),JSON.stringify({version:1,view:'3d',motion:'off',email:'no@example.test'}),'x'.repeat(2049)]) {
    expect(parsePreferences(value)).toEqual(defaultPreferences());
  }
});
test('auto quality protects mobile/save-data and honors explicit light and reduced motion', () => {
  const desktop={width:1440,coarse:false,saveData:false,cores:8,reduced:false};
  expect(resolvePresentation(defaultPreferences(),desktop)).toEqual({view:'3d',quality:'high',motion:true});
  expect(resolvePresentation(defaultPreferences(),{...desktop,width:390,coarse:true})).toEqual({view:'lite',quality:'low',motion:true});
  expect(resolvePresentation(defaultPreferences(),{...desktop,reduced:true})).toEqual({view:'lite',quality:'high',motion:false});
  expect(resolvePresentation({version:1,view:'3d',motion:'system'},{...desktop,width:390,coarse:true,reduced:true})).toEqual({view:'3d',quality:'low',motion:false});
  expect(resolvePresentation(defaultPreferences(),desktop,'lite').view).toBe('lite');
  expect(resolvePresentation({version:1,view:'auto',motion:'off'},desktop).motion).toBe(false);
});
