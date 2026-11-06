"""Isolated filesystem tests for a config helper, NOT Expo/Android runtime tests."""
from pathlib import Path
from PIL import Image
import copy
import hashlib
import json
import shutil
import subprocess
import tempfile

ROOT = Path('/home/user')
PACK = ROOT / 'EnglishLearning-Offline-Doctor-Fix-v1'
EVIDENCE = ROOT / 'EnglishLearning-Offline-Doctor-Fix-v1-Evidence'
SCRIPT = PACK / 'fix-expo-doctor-v1.cjs'
ICON = PACK / 'assets/icon-square-v1.png'
ORIGINAL = ROOT / 'EnglishLearning-Offline'
preparation = json.loads((EVIDENCE / 'preparation.json').read_text())
results = []


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_map(root):
    return {str(p.relative_to(root)): digest(p.read_bytes())
            for p in root.rglob('*') if p.is_file()}


def check_originals():
    for name, expected in preparation['original_file_hashes'].items():
        assert digest((ROOT / name).read_bytes()) == expected, name


def fixture(parent):
    project = parent / 'project'
    project.mkdir(parents=True)
    (project / 'assets').mkdir()
    (project / 'node_modules/expo').mkdir(parents=True)
    # Only fixture metadata for the version guard; actual Expo is not installed.
    (project / 'node_modules/expo/package.json').write_text(
        '{"version":"51.0.28","fixtureOnly":true}\n', encoding='utf-8')
    config = json.loads((ORIGINAL / 'app.json').read_text())
    config['expo']['plugins'] = [p for p in config['expo']['plugins']
                                 if (p[0] if isinstance(p, list) else p) != 'expo-sqlite']
    config['expo']['extra']['eas']['projectId'] = 'preserve-local-fixture-project-marker'
    config['expo']['extra']['fixtureMarker'] = 'do-not-log-local-fixture-marker'
    (project / 'app.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    shutil.copy2(ORIGINAL / 'package.json', project / 'package.json')
    shutil.copy2(ORIGINAL / 'eas.json', project / 'eas.json')
    # Not a real dependency lock and never used for an installation or delivered.
    (project / 'package-lock.json').write_text(
        '{"name":"englishlearning-offline","lockfileVersion":3,"fixtureOnly":true}\n', encoding='utf-8')
    shutil.copy2(ORIGINAL / 'assets/icon.png', project / 'assets/icon.png')
    shutil.copy2(ICON, project / 'assets/icon-square-v1.png')
    (project / 'unchanged.fixture').write_bytes(b'fixture-only: preserve all unrelated files\n')
    return project


def invoke(project):
    result = subprocess.run(['node', str(SCRIPT)], cwd=project, text=True, capture_output=True)
    combined = result.stdout + result.stderr
    assert 'do-not-log-local-fixture-marker' not in combined
    assert 'preserve-local-fixture-project-marker' not in combined
    assert str(project) not in combined
    return result


def backups(parent):
    return sorted(parent.glob('EnglishLearning-Offline-before-doctor-v1-*'))


check_originals()
syntax = subprocess.run(['node', '--check', str(SCRIPT)], capture_output=True, text=True)
assert syntax.returncode == 0
results.append({'check': 'JavaScript syntax under local Node', 'result': 'PASS'})
with Image.open(ICON) as image:
    assert image.format == 'PNG' and image.size == (1024, 1024) and image.mode == 'RGB'
    image.verify()
assert digest(ICON.read_bytes()) == preparation['icon']['sha256']
results.append({'check': 'PNG integrity, 1024x1024 size, and helper checksum', 'result': 'PASS'})

with tempfile.TemporaryDirectory(prefix='doctor-fix-v1-tests-', dir=ROOT) as temporary:
    base = Path(temporary)
    project = fixture(base / 'success')
    initial = file_map(project)
    original_config = json.loads((project / 'app.json').read_text())
    original_bytes = {name: (project / name).read_bytes()
                      for name in ('app.json', 'package.json', 'package-lock.json', 'eas.json')}
    result = invoke(project)
    assert result.returncode == 0 and 'OK - square icon ready; backup verified.' in result.stdout
    expected = copy.deepcopy(original_config)
    expected['expo']['icon'] = './assets/icon-square-v1.png'
    expected['expo']['android']['adaptiveIcon']['foregroundImage'] = './assets/icon-square-v1.png'
    assert json.loads((project / 'app.json').read_text()) == expected
    after = file_map(project)
    assert set(after) == set(initial)
    for name, before in initial.items():
        if name != 'app.json':
            assert after[name] == before
    saved = backups(project.parent)
    assert len(saved) == 1
    for name, data in original_bytes.items():
        assert (saved[0] / name).read_bytes() == data
    results.append({'check': 'Only two icon fields change; other config values and all other project files preserved; byte-exact sibling backups', 'result': 'PASS'})

    before_repeat = file_map(project)
    second = invoke(project)
    assert second.returncode == 0
    assert file_map(project) == before_repeat
    assert len(backups(project.parent)) == 2
    assert all((saved[0] / name).read_bytes() == data for name, data in original_bytes.items())
    results.append({'check': 'Repeat execution is content-idempotent and does not overwrite earlier backups', 'result': 'PASS'})

    def missing_icon(p):
        (p / 'assets/icon-square-v1.png').unlink()

    def modified_icon(p):
        image = p / 'assets/icon-square-v1.png'
        image.write_bytes(image.read_bytes() + b'fixture-change')

    def wrong_sdk(p):
        (p / 'node_modules/expo/package.json').write_text('{"version":"52.0.0","fixtureOnly":true}')

    def wrong_project(p):
        value = json.loads((p / 'package.json').read_text())
        value['name'] = 'other-local-fixture'
        (p / 'package.json').write_text(json.dumps(value))

    def dynamic_config(p):
        (p / 'app.config.js').write_text('throw new Error("This fixture must never execute");\n')

    def invalid_lock(p):
        (p / 'package-lock.json').write_text('{"fixture":"do-not-log-local-fixture-marker", INVALID')

    def custom_icon(p):
        value = json.loads((p / 'app.json').read_text())
        value['expo']['icon'] = './assets/custom-fixture.png'
        (p / 'app.json').write_text(json.dumps(value))

    def missing_lock(p):
        (p / 'package-lock.json').unlink()

    def symlink_config(p):
        content = (p / 'app.json').read_bytes()
        other = p.parent / 'external-fixture-config.json'
        other.write_bytes(content)
        (p / 'app.json').unlink()
        (p / 'app.json').symlink_to(other)

    cases = [
        ('missing-icon', missing_icon),
        ('modified-icon', modified_icon),
        ('unsupported-sdk', wrong_sdk),
        ('wrong-project', wrong_project),
        ('dynamic-config', dynamic_config),
        ('invalid-lock-no-content-leak', invalid_lock),
        ('preserve-custom-icon', custom_icon),
        ('missing-lock', missing_lock),
        ('reject-symlink-config', symlink_config),
    ]
    for label, mutate in cases:
        project = fixture(base / label)
        mutate(project)
        before = file_map(project)
        result = invoke(project)
        assert result.returncode != 0 and result.stderr.startswith('STOP - '), label
        assert file_map(project) == before, label
        assert not backups(project.parent), label
        results.append({'check': 'Fail safely without project changes: ' + label, 'result': 'PASS'})

check_originals()
node = subprocess.check_output(['node', '--version'], text=True).strip()
report = {
    'date': '2026-11-04',
    'environment': 'Isolated disposable Linux filesystem fixtures; Node ' + node,
    'checks': results,
    'original_project_files': 'Unchanged (preparation hashes rechecked)',
    'database_access': 'None',
    'dependency_installation': 'None',
    'not_tested': [
        'Windows CMD / Node 24 execution',
        'Real Expo CLI / expo-doctor execution on this package',
        'Native dependency installation or TypeScript installation',
        'EAS account linking or cloud build',
        'Android APK compilation, installation, or offline app runtime',
        'Security vulnerability remediation'
    ]
}
(EVIDENCE / 'validation-results.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(str(len(results)) + ' isolated helper/image checks passed.')
print('Original app.json, package.json, and icon are unchanged.')
print('No dependencies installed and no database accessed.')
print('Windows, real Expo checks, EAS, APK, and app runtime are NOT TESTED here.')
