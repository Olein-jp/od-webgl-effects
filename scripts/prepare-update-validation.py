#!/usr/bin/env python3
"""使い捨てSQLite WordPressに管理画面更新の検証環境を作る。公開操作は行わない。"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile
from urllib.parse import urlparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-wp', required=True)
parser.add_argument('--wp-cli', required=True)
parser.add_argument('--package', required=True)
parser.add_argument('--sha256', required=True)
parser.add_argument('--release-tag', required=True)
parser.add_argument('--base-url', default='http://127.0.0.1:8901')
args = parser.parse_args()
source, package = Path(args.source_wp).resolve(), Path(args.package).resolve()
url = urlparse(args.base_url)
if url.scheme != 'http' or url.hostname not in ('localhost', '127.0.0.1') or url.path not in ('', '/'):
    parser.error('検証先はループバックのHTTPルートに限定します。')
if not re.fullmatch(r'[a-zA-Z0-9-]+', args.release_tag):
    parser.error('検証タグは英数字とハイフンに限定します。')
if hashlib.sha256(package.read_bytes()).hexdigest() != args.sha256:
    parser.error('ZIPのSHA-256が一致しません。')
if not (source / 'wp-load.php').is_file() or not (source / 'wp-content/plugins/sqlite-database-integration').is_dir():
    parser.error('使い捨てSQLite WordPressのコアとSQLiteプラグインが必要です。')
site = Path(tempfile.mkdtemp(prefix='od-update-validation-'))

def exclude(path, names):
    path = Path(path)
    if path == source / 'wp-content':
        return [n for n in names if n in ('database', 'uploads', 'debug.log')]
    if path == source / 'wp-content/plugins':
        return [n for n in names if n != 'sqlite-database-integration']
    return [n for n in names if n in ('wp-config.php', 'wp-cli.yml')]

shutil.copytree(source, site, dirs_exist_ok=True, ignore=exclude)
base = args.base_url.rstrip('/')
config = f'''<?php
// 検証専用の独立したSQLite環境。元サイトの設定・DBを使用しない。
define('DB_NAME','od_update_validation');define('DB_USER','unused');define('DB_PASSWORD','unused');define('DB_HOST','localhost');
define('DB_CHARSET','utf8');define('DB_COLLATE','');
define('WP_HOME',{json.dumps(base)});define('WP_SITEURL',{json.dumps(base)});
define('WP_ENVIRONMENT_TYPE','local');define('DISABLE_WP_CRON',true);define('FS_METHOD','direct');
define('WP_HTTP_BLOCK_EXTERNAL',true);
define('WP_ACCESSIBLE_HOSTS','api.github.com,github.com,raw.githubusercontent.com,objects.githubusercontent.com,release-assets.githubusercontent.com');
define('WP_DEBUG',true);define('WP_DEBUG_LOG',true);define('WP_DEBUG_DISPLAY',false);
$table_prefix='wp_';if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');require_once ABSPATH.'wp-settings.php';
'''
(site / 'wp-config.php').write_text(config)
(site / 'wp-config.php').chmod(0o600)
wp = ['php', str(Path(args.wp_cli).resolve()), '--path=' + str(site)]
subprocess.run(wp + ['core', 'install', '--url=' + base, '--title=OD update validation', '--admin_user=admin', '--admin_password=update-validation-password', '--admin_email=admin@example.test', '--skip-email'], check=True)
subprocess.run(wp + ['plugin', 'install', str(package), '--activate'], check=True)
entry = site / 'wp-content/plugins/od-webgl-effects/od-webgl-effects.php'
version = re.search(r'^ \* Version: (.+)$', entry.read_text(), re.M).group(1)
if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+', version):
    raise ValueError('検証対象はx.y.z形式のバージョンに限定します。')
entry.write_text(entry.read_text().replace(' * Version: ' + version, ' * Version: 0.0.9', 1))
mu = site / 'wp-content/mu-plugins'
mu.mkdir(exist_ok=True)
fixture = (Path(__file__).resolve().parents[1] / 'tests/update/validation-hooks.php').read_text()
(mu / 'od-update-validation.php').write_text(fixture.replace('__RELEASE_TAG__', args.release_tag).replace('__TARGET_VERSION__', version))
create = '''$content='<!-- wp:group {"odWebgl":{"version":1,"enabled":true,"effect":"aurora","settings":{"speed":1.25,"colors":["#fff","#000"]}}} --><div class="wp-block-group"><p>Update preserves content</p></div><!-- /wp:group -->'; $id=wp_insert_post(array('post_title'=>'Update validation fixture','post_content'=>$content,'post_status'=>'publish'));update_option('od_update_validation_post',array('id'=>$id,'content'=>$content));echo wp_json_encode(array('id'=>$id,'content'=>$content));'''
post = json.loads(subprocess.check_output(wp + ['eval', create], text=True))
with zipfile.ZipFile(package) as archive:
    if any(not name.startswith('od-webgl-effects/') or '..' in Path(name).parts for name in archive.namelist()):
        raise ValueError('配布ZIPの格納パスが不正です。')
    files = {name.removeprefix('od-webgl-effects/'): hashlib.sha256(archive.read(name)).hexdigest() for name in archive.namelist() if not name.endswith('/')}
scenario = {'files': files, 'site': str(site), 'baseUrl': base, 'wpCli': str(Path(args.wp_cli).resolve()), 'releaseTag': args.release_tag, 'oldVersion': '0.0.9', 'newVersion': version, 'packageSha256': args.sha256, 'package': str(package), 'post': post}
output = site / 'scenario.json'
output.write_text(json.dumps(scenario, ensure_ascii=False, indent=2))
output.chmod(0o600)
print('SCENARIO=' + str(output))
