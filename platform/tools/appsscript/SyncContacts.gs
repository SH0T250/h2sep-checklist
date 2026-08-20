/**
 * H2SEP contact list -> field app sync.
 *
 * Lives inside the contact list spreadsheet (Extensions > Apps Script) and
 * pushes the sheet into the app's directory document:
 *   projects/h2sep/platform_rooms/_dir
 * The app listens to that collection, so every phone and desktop with the app
 * open picks the change up within seconds. Nothing to install on a computer.
 *
 * What it does NOT do:
 *   - it never deletes. A row removed from the sheet is archived in the app.
 *   - it never overwrites a contact that was edited in the app since the last
 *     sync. Those are reported so Austin decides which one is right.
 *   - it only writes the fields that actually changed.
 *
 * Sign-in is the same anonymous sign-in the crew app uses, so this needs no
 * service account, no key file, and no admin rights on the Firebase project.
 */

var API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';   // public by design, same as the app
var BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
var COL = 'projects/h2sep/platform_rooms';
var DOC = '_dir';
var FIELDS = ['category', 'org', 'scope', 'name', 'title', 'phone', 'email', 'address', 'note'];
var HEADERS = {                       // sheet header text -> record field
  'Category': 'category', 'Organization': 'org', 'Scope / Trade': 'scope',
  'Contact Name': 'name', 'Title / Role': 'title', 'Phone': 'phone',
  'Email': 'email', 'Address': 'address', 'Notes': 'note'
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('H2SEP App')
    .addItem('Sync contacts to the app now', 'syncContacts')
    .addItem('Sync and let the sheet win', 'syncContactsSheetWins')
    .addSeparator()
    .addItem('Turn on hourly sync', 'installHourlyTrigger')
    .addItem('Turn off hourly sync', 'removeTriggers')
    .addToUi();
}

function installHourlyTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('syncContacts').timeBased().everyHours(1).create();
  SpreadsheetApp.getActive().toast('Hourly sync is on. It also syncs whenever you use the menu.');
}
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncContacts') ScriptApp.deleteTrigger(t);
  });
}

/** Anonymous sign-in, reusing the same account every run via a cached refresh token. */
function idToken_() {
  var props = PropertiesService.getScriptProperties();
  var refresh = props.getProperty('h2sep_refresh');
  if (refresh) {
    var r = UrlFetchApp.fetch('https://securetoken.googleapis.com/v1/token?key=' + API_KEY, {
      method: 'post', contentType: 'application/x-www-form-urlencoded',
      payload: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refresh),
      muteHttpExceptions: true
    });
    if (r.getResponseCode() === 200) return JSON.parse(r.getContentText()).id_token;
    props.deleteProperty('h2sep_refresh');            // stale, fall through to a fresh sign-in
  }
  var s = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + API_KEY, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ returnSecureToken: true }), muteHttpExceptions: true
  });
  var j = JSON.parse(s.getContentText());
  if (!j.idToken) throw new Error('sign-in failed: ' + s.getContentText().slice(0, 200));
  props.setProperty('h2sep_refresh', j.refreshToken);
  return j.idToken;
}

function slug_(s) {
  var t = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return t.slice(0, 18) || 'x';
}
function enc_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return v % 1 === 0 ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Object.prototype.toString.call(v) === '[object Array]') {
    return { arrayValue: { values: v.map(enc_) } };
  }
  var f = {};
  for (var k in v) f[k] = enc_(v[k]);
  return { mapValue: { fields: f } };
}
function dec_(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec_);
  if ('mapValue' in v) {
    var o = {}, f = v.mapValue.fields || {};
    for (var k in f) o[k] = dec_(f[k]);
    return o;
  }
  return v;
}

/** Read the sheet into records keyed by the same stable id the app uses. */
function readSheet_() {
  var sh = SpreadsheetApp.getActive().getSheets()[0];
  var values = sh.getDataRange().getDisplayValues();
  var headRow = -1, colOf = {};
  for (var r = 0; r < values.length && headRow < 0; r++) {
    var row = values[r], hits = 0, map = {};
    for (var c = 0; c < row.length; c++) {
      var key = HEADERS[String(row[c]).trim()];
      if (key) { map[key] = c; hits++; }
    }
    if (hits >= 5) { headRow = r; colOf = map; }
  }
  if (headRow < 0) throw new Error('could not find the header row (Category, Organization, ...)');

  var out = {}, seen = {}, sort = 0;
  for (var i = headRow + 1; i < values.length; i++) {
    var row = values[i], rec = {};
    for (var f in colOf) rec[f] = String(row[colOf[f]] || '').trim();
    if (!rec.org && !rec.name) continue;                 // blank or placeholder row
    var id = 'c_' + slug_(rec.org) + '_' + slug_(rec.name || 'x').slice(0, 6);
    while (seen[id]) id += 'x';
    seen[id] = true;
    sort += 10;
    out[id] = {
      category: rec.category || 'Other', org: rec.org, scope: rec.scope || '', name: rec.name || '',
      title: rec.title || '', phone: rec.phone || '', email: rec.email || '', address: rec.address || '',
      note: rec.note || '', sort: sort, deleted: false, src: 'sheet'
    };
  }
  return out;
}

function syncContacts() { return syncContacts_(false); }

/**
 * Same sync, but the sheet overwrites contacts that were edited in the app.
 *
 * Needed because a record whose src is not 'sheet' always differs, and an app
 * edit always makes updatedAt newer than syncedAt — so the ordinary sync
 * reports it and skips it, every hour, with no way for the sheet to ever take
 * ownership back. That is a deadlock, not a disagreement. Run this once to
 * settle it in the sheet's favour.
 */
function syncContactsSheetWins() { return syncContacts_(true); }

function syncContacts_(force) {
  var now = new Date().toISOString();
  var rows = readSheet_();
  var token = idToken_();
  var H = { authorization: 'Bearer ' + token };

  var got = UrlFetchApp.fetch(BASE + '/' + COL + '/' + DOC, { headers: H, muteHttpExceptions: true });
  if (got.getResponseCode() !== 200) throw new Error('cannot read the app directory: ' + got.getContentText().slice(0, 200));
  var live = dec_({ mapValue: { fields: JSON.parse(got.getContentText()).fields } });
  var liveItems = live.items || {};

  var patch = {}, added = 0, changed = 0, archived = 0, conflicts = [];
  for (var id in rows) {
    var want = rows[id], have = liveItems[id];
    if (!have) {
      var rec = {};
      for (var k in want) rec[k] = want[k];
      rec.createdAt = now; rec.updatedAt = now; rec.syncedAt = now;
      patch['items.' + id] = rec;
      added++;
      continue;
    }
    var diffs = [];
    for (var fi = 0; fi < FIELDS.length; fi++) {
      var f = FIELDS[fi];
      if (String(have[f] === undefined ? '' : have[f]) !== String(want[f] === undefined ? '' : want[f])) diffs.push(f);
    }
    if (have.deleted) diffs.push('deleted');
    if (have.src !== 'sheet') diffs.push('src');
    if (!diffs.length) continue;

    var since = have.syncedAt || have.createdAt || '';
    if (!force && have.updatedAt && have.updatedAt > since) {   // edited in the app since the last sync
      conflicts.push((want.org || '') + (want.name ? ' / ' + want.name : '') + ': ' + diffs.join(', '));
      continue;
    }
    for (var di = 0; di < diffs.length; di++) {
      var d = diffs[di];
      if (d === 'deleted') patch['items.' + id + '.deleted'] = false;
      else if (d === 'src') patch['items.' + id + '.src'] = 'sheet';
      else patch['items.' + id + '.' + d] = want[d];
    }
    patch['items.' + id + '.updatedAt'] = now;
    patch['items.' + id + '.syncedAt'] = now;
    changed++;
  }
  for (var lid in liveItems) {
    if (rows[lid]) continue;
    var h = liveItems[lid];
    if (h.src !== 'sheet' || h.deleted) continue;         // added in the app, or already archived
    patch['items.' + lid + '.deleted'] = true;
    patch['items.' + lid + '.updatedAt'] = now;
    archived++;
  }

  var msg;
  if (!Object.keys(patch).length) {
    msg = 'Already up to date. ' + Object.keys(rows).length + ' contacts.';
  } else {
    patch.updatedAt = now;
    // Firestore takes the update mask as query parameters and Apps Script caps a
    // fetch URL at about 2 KB. An ordinary sync changes a handful of fields and
    // fits with room to spare; restoring the whole directory after a wipe needs
    // roughly 600 field paths, which overran the cap and failed with
    // "Limit Exceeded: URLFetch URL Length" — breaking the recovery path at the
    // one moment it mattered. So the patch goes out in URL-sized batches.
    //
    // Batches are not atomic with each other. That is the right trade here: a
    // half-applied restore is repaired by running the sync again (it only ever
    // writes what still differs), whereas no write at all leaves the app empty.
    var paths = [];
    for (var path in patch) paths.push(path);
    var batches = [], batch = [], qsLen = 0;
    for (var ei = 0; ei < paths.length; ei++) {
      var segLen = ('updateMask.fieldPaths=' + encodeURIComponent(maskPath_(paths[ei])) + '&').length;
      if (batch.length && qsLen + segLen > 1600) { batches.push(batch); batch = []; qsLen = 0; }
      batch.push(paths[ei]);
      qsLen += segLen;
    }
    if (batch.length) batches.push(batch);
    for (var bi = 0; bi < batches.length; bi++) writeBatch_(batches[bi], patch, H);
    msg = 'Synced. ' + added + ' added, ' + changed + ' updated, ' + archived + ' archived.'
        + (force ? ' Sheet forced over app edits.' : '')
        + (batches.length > 1 ? ' (' + batches.length + ' batches)' : '');
  }
  if (conflicts.length) {
    msg += ' ' + conflicts.length + ' left alone because they were edited in the app: ' + conflicts.join(' | ');
  }
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, 'H2SEP app sync', 12); } catch (e) { /* time trigger has no UI */ }
  return msg;
}

/** One update-mask field path, backtick-quoting any segment that is not a plain
 *  identifier (contact ids are, but the sheet can grow odd keys). */
function maskPath_(path) {
  return path.split('.').map(function (seg) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(seg) ? seg : '`' + seg.replace(/`/g, '\\`') + '`';
  }).join('.');
}

/** PATCH one batch of field paths, sending only those fields in the body. */
function writeBatch_(paths, patch, H) {
  var body = {}, qs = [];
  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    qs.push('updateMask.fieldPaths=' + encodeURIComponent(maskPath_(path)));
    var parts = path.split('.'), t = body;
    for (var pi = 0; pi < parts.length - 1; pi++) { if (!t[parts[pi]]) t[parts[pi]] = {}; t = t[parts[pi]]; }
    t[parts[parts.length - 1]] = patch[path];
  }
  var res = UrlFetchApp.fetch(BASE + '/' + COL + '/' + DOC + '?' + qs.join('&'), {
    method: 'patch', contentType: 'application/json', headers: H,
    payload: JSON.stringify({ fields: enc_(body).mapValue.fields }), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('write failed: ' + res.getContentText().slice(0, 300));
}
