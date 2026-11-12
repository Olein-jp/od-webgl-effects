// 準備済みの使い捨て環境で、標準の管理画面から更新し、保存内容を確認する。
const fs=require('node:fs');const {createHash}=require('node:crypto');const path=require('node:path');const {execFileSync}=require('node:child_process');const {chromium,expect}=require('@playwright/test');
async function main(){
 const scenarioPath=process.argv[2];if(!scenarioPath)throw new Error('scenario.json を指定してください。');
 const scenario=JSON.parse(fs.readFileSync(scenarioPath,'utf8'));const url=new URL(scenario.baseUrl);
 if(!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('検証先はループバックに限定します。');
 const wp=args=>execFileSync('php',[scenario.wpCli,'--path='+scenario.site,...args],{encoding:'utf8',timeout:120000});
 const local=wp(['eval',"echo wp_get_environment_type();"]);if(local.trim()!=='local')throw new Error('ローカル環境ではありません。');
 wp(['eval',"delete_site_transient('update_plugins');delete_transient('wp_github_plugin_updater_od-webgl-effects/od-webgl-effects.php');delete_transient('wp_github_plugin_updater_repository_data_od-webgl-effects/od-webgl-effects.php');wp_update_plugins();"]);
 const update=JSON.parse(wp(['eval',"$t=get_site_transient('update_plugins');echo wp_json_encode($t->response['od-webgl-effects/od-webgl-effects.php']??null);"]));
 if(!update || update.new_version!==scenario.newVersion || !update.package.includes('/releases/download/'+scenario.releaseTag+'/od-webgl-effects.zip'))throw new Error('期待するRelease添付ZIPの更新通知がありません: '+JSON.stringify(update));
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(scenario.baseUrl+'/wp-login.php');await page.locator('#user_login').fill('admin');await page.locator('#user_pass').fill('update-validation-password');await page.locator('#wp-submit').click();await page.waitForURL('**/wp-admin/**');
  await page.goto(scenario.baseUrl+'/wp-admin/plugins.php?plugin_status=upgrade');
  const link=page.locator('#od-webgl-effects-update .update-link');await expect(link).toBeVisible();await link.click();
  await expect(page.locator('#od-webgl-effects-update')).toContainText('Updated!',{timeout:120000});
  await page.screenshot({path:path.join(scenario.site,'update-completed.png'),fullPage:true});
 }finally{await browser.close();}
 const result=JSON.parse(wp(['eval',"require_once ABSPATH.'wp-admin/includes/plugin.php';$p=get_option('od_update_validation_post');echo wp_json_encode(array('version'=>get_plugin_data(WP_PLUGIN_DIR.'/od-webgl-effects/od-webgl-effects.php')['Version'],'active'=>is_plugin_active('od-webgl-effects/od-webgl-effects.php'),'contentPreserved'=>get_post($p['id'])->post_content===$p['content'],'package'=>get_option('od_update_validation_download'),'autoload'=>file_exists(WP_PLUGIN_DIR.'/od-webgl-effects/vendor/autoload.php')));"]));
 if(result.version!==scenario.newVersion || !result.active || !result.contentPreserved || !result.autoload)throw new Error('更新後の状態が一致しません: '+JSON.stringify(result));
 for(const [name,digest] of Object.entries(scenario.files)){const actual=createHash('sha256').update(fs.readFileSync(path.join(scenario.site,'wp-content/plugins/od-webgl-effects',name))).digest('hex');if(actual!==digest)throw new Error('ZIPと導入ファイルが一致しません: '+name);}
 result.packageFilesVerified=Object.keys(scenario.files).length;
 fs.writeFileSync(path.join(scenario.site,'update-result.json'),JSON.stringify({...result,oldVersion:scenario.oldVersion,expectedPackageSha256:scenario.packageSha256,releaseTag:scenario.releaseTag},null,2));console.log('GITHUB_RELEASE_UI_UPDATE_OK',JSON.stringify(result));
}
main().catch(error=>{console.error(error);process.exit(1);});
