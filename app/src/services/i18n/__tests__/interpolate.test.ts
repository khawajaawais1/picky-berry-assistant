import { interpolate } from '../index';

/**
 * Copy that carries a runtime value — screen 04 names the destination the code belongs to.
 * The catalogue holds the sentence with a `{destination}` placeholder; this fills it, in
 * the language the sentence is written in, so no component concatenates its own grammar.
 */
describe('interpolate', () => {
  it('fills the placeholder with the value', () => {
    expect(
      interpolate('Enter the 6-digit code for {destination}.', {
        destination: 'aino@example.fi',
      }),
    ).toBe('Enter the 6-digit code for aino@example.fi.');
  });

  it('fills every occurrence of a placeholder', () => {
    expect(interpolate('{name}, say it again, {name}.', { name: 'Aino' })).toBe(
      'Aino, say it again, Aino.',
    );
  });

  it('leaves a value the copy does not name where it is', () => {
    // The catalogue test keeps the placeholders of every locale in step, so a value with
    // no placeholder is a caller's mistake; leaving the sentence alone is louder than
    // printing it into copy that never asked for it.
    expect(interpolate('Signed up by phone instead?', { destination: 'aino@example.fi' })).toBe(
      'Signed up by phone instead?',
    );
  });

  it('leaves a placeholder without a value visible, rather than printing “undefined”', () => {
    // A missing value is a defect the screen should show, not one it should hide behind a
    // word that looks like copy.
    expect(interpolate('Code for {destination}.', {})).toBe('Code for {destination}.');
  });
});
