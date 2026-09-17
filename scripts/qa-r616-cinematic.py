#!/usr/bin/env python3
"""Loaded WebGL heroes, not loading/fallback screenshots, are required.

Software-renderer timings are diagnostic, never physical-laptop FPS sign-off.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HEROES = ['integrated-campus','manufacturing-line','substation-bess',
          'data-center-cooling','recycling-intake','connected-campus']


def capture(browser, base, out, quality, width, height):
    context = browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
    page = context.new_page()
    errors, failed, frames = [], [], []
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
    page.on('response',lambda response:failed.append(f'{response.status} {response.url}') if response.status>=400 else None)
    try:
        page.goto(base.rstrip('/')+'/?'+urlencode({'quality':quality}),wait_until='domcontentloaded',timeout=60000)
        page.wait_for_selector('.experience-canvas canvas',timeout=60000)
        controls=page.locator('.story-progress .progress-dot')
        assert controls.count()==6, 'Six chapter controls are required'
        for index in [0,1,2,3,4,5,3]:
            controls.nth(index).click(timeout=60000)
            page.wait_for_function("i => document.querySelectorAll('.progress-dot')[i]?.dataset.active === 'true'",arg=index,timeout=30000)
            page.wait_for_function("hero => window.__CONVALT_ACTIVE_HERO__?.hero === hero && window.__CONVALT_ACTIVE_HERO__?.ready",arg=HEROES[index],timeout=60000)
            page.wait_for_timeout(2600)
            assert page.locator('[data-r6-static-fallback="true"]').count()==0, 'Fallback is not immersive proof'
            assert page.locator('.experience-canvas canvas').count()==1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Horizontal overflow'
            repeat='-revisit' if len(frames)==6 else ''
            name=f'{quality}-{index+1:02d}-{HEROES[index]}{repeat}.png'
            page.screenshot(path=str(out/name))
            frames.append({'image':name,'hero':page.evaluate('window.__CONVALT_ACTIVE_HERO__'),
                'telemetry':page.evaluate('window.__CONVALT_PERF__?.samples?.at(-1) || null')})
        page.evaluate("document.documentElement.dataset.motion='reduced'")
        controls.nth(1).click()
        page.wait_for_function("window.__CONVALT_ACTIVE_HERO__?.hero === 'manufacturing-line'",timeout=60000)
        page.wait_for_timeout(1600)
        page.screenshot(path=str(out/f'{quality}-manufacturing-reduced-motion.png'))
        assert not errors, '\n'.join(errors[:15])
        assert not failed, '\n'.join(failed[:15])
        return {'quality':quality,'viewport':[width,height],'frames':frames,'errors':errors,'failedResponses':failed,'pass':True}
    finally:
        (out/f'{quality}-diagnostics.json').write_text(json.dumps({'frames':frames,'errors':errors,'failedResponses':failed},indent=2))
        context.close()


def fallback(browser,base,out):
    context=browser.new_context(viewport={'width':1280,'height':800})
    page=context.new_page()
    page.add_init_script("""(() => { const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        if (/webgl/.test(type)) return null; return original.call(this,type,...args);
      }; })();""")
    try:
        page.goto(base.rstrip('/')+'/?quality=high',wait_until='domcontentloaded')
        page.wait_for_selector('[data-r6-static-fallback="true"]',timeout=30000)
        assert page.locator('.experience-canvas canvas').count()==0
        page.screenshot(path=str(out/'forced-webgl-fallback.png'))
        return {'pass':True}
    finally:
        context.close()


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:3000')
    parser.add_argument('--out',default='artifacts/cinematic/chapters')
    args=parser.parse_args()
    out=Path(args.out); out.mkdir(parents=True,exist_ok=True)
    report={'pass':False,'fpsSignOff':False,'renderer':'Chromium software WebGL; visual/functional proof only'}
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
            try:
                report['desktop']=capture(browser,args.url,out,'high',1440,900)
                report['mobile']=capture(browser,args.url,out,'medium',430,932)
                report['fallback']=fallback(browser,args.url,out)
                report['pass']=True
            finally:
                browser.close()
    finally:
        (out/'report.json').write_text(json.dumps(report,indent=2))
    print('Six-hero desktop/mobile/revisit/reduced-motion/fallback proof passed.')

if __name__=='__main__':
    main()
