#!/usr/bin/env python3
"""Capture the real high/medium WebGL pipelines in stable reduced-motion poses.

CPU-rendered stills verify appearance, not a desktop animation/FPS sign-off.
An independent medium-tier mobile check exercises normal animated navigation.
"""
import argparse
import json
import os
import time
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HEROES = ['integrated-campus','manufacturing-line','substation-bess',
          'data-center-cooling','recycling-intake','connected-campus']


def screenshot(page, path):
    page.screenshot(path=str(path),timeout=90000,animations='disabled',caret='hide')
    assert path.is_file() and path.stat().st_size>10000, 'Missing or empty screenshot'


def capture(browser, base, out, quality, width, height):
    # Keep the full requested render quality and LOD0. Reduced motion only
    # stabilizes the authored camera and rotors for reproducible visual review.
    context = browser.new_context(viewport={'width':width,'height':height},
        device_scale_factor=1,reduced_motion='reduce')
    page = context.new_page()
    errors, warnings, failed, request_failures, frames = [], [], [], [], []
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('console',lambda message:(errors if message.type=='error' else warnings).append(message.text) if message.type in ('error','warning') else None)
    page.on('response',lambda response:failed.append(f'{response.status} {response.url}') if response.status>=400 else None)
    page.on('requestfailed',lambda request:request_failures.append(f'{request.failure} {request.url}'))
    try:
        page.goto(base.rstrip('/')+'/?'+urlencode({'quality':quality}),wait_until='domcontentloaded',timeout=60000)
        page.wait_for_selector('.experience-canvas canvas',timeout=60000)
        page.wait_for_function("document.documentElement.dataset.motion === 'reduced'",timeout=30000)
        controls=page.locator('.story-progress .progress-dot')
        assert controls.count()==6, 'Six chapter controls are required'
        for sequence,index in enumerate([0,1,2,3,4,5,3]):
            controls.nth(index).click(timeout=60000)
            page.wait_for_function("i => document.querySelectorAll('.progress-dot')[i]?.dataset.active === 'true'",arg=index,timeout=60000)
            page.wait_for_function("hero => window.__CONVALT_ACTIVE_HERO__?.hero === hero && window.__CONVALT_ACTIVE_HERO__?.ready",arg=HEROES[index],timeout=60000)
            page.wait_for_timeout(2200)
            assert page.locator('[data-r6-static-fallback="true"]').count()==0, 'Fallback is not immersive proof'
            assert page.locator('.experience-canvas canvas').count()==1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Horizontal overflow'
            repeat='-revisit' if sequence==6 else ''
            name=f'{quality}-{index+1:02d}-{HEROES[index]}{repeat}.png'
            frame={'image':name,'hero':page.evaluate('window.__CONVALT_ACTIVE_HERO__'),
                'telemetry':page.evaluate('window.__CONVALT_PERF__?.samples?.at(-1) || null'),
                'screenshotCaptured':False}
            frames.append(frame)
            print('POSED_CAPTURE',quality,HEROES[index],flush=True)
            started=time.monotonic()
            screenshot(page,out/name)
            frame['screenshotCaptured']=True
            frame['captureSeconds']=round(time.monotonic()-started,3)
        assert not errors, '\n'.join(errors[:15])
        assert not failed, '\n'.join(failed[:15])
        assert not request_failures, '\n'.join(request_failures[:15])
        return {'quality':quality,'viewport':[width,height],'captureMode':'reduced-motion WebGL poses',
            'frames':frames,'errors':errors,'failedResponses':failed,'requestFailures':request_failures,'pass':True}
    finally:
        (out/f'{quality}-diagnostics.json').write_text(json.dumps({'frames':frames,'errors':errors,
            'warnings':warnings,'failedResponses':failed,'requestFailures':request_failures},indent=2))
        context.close()


def animated_mobile_navigation(browser,base):
    context=browser.new_context(viewport={'width':430,'height':932},device_scale_factor=1,reduced_motion='no-preference')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        page.goto(base.rstrip('/')+'/?quality=medium',wait_until='domcontentloaded',timeout=60000)
        page.wait_for_function("window.__CONVALT_ACTIVE_HERO__?.hero === 'integrated-campus'",timeout=60000)
        page.wait_for_function("document.documentElement.dataset.motion !== 'reduced'",timeout=30000)
        result=[]
        for index in [1,2,3,4,5,0]:
            page.locator('.story-progress .progress-dot').nth(index).click(timeout=60000)
            started=time.monotonic()
            page.wait_for_function("i => document.querySelectorAll('.progress-dot')[i]?.dataset.active === 'true'",arg=index,timeout=120000)
            page.wait_for_function("hero => window.__CONVALT_ACTIVE_HERO__?.hero === hero && window.__CONVALT_ACTIVE_HERO__?.ready",arg=HEROES[index],timeout=60000)
            page.wait_for_timeout(2600)
            result.append({'hero':HEROES[index],'transitionSeconds':round(time.monotonic()-started,3)})
        assert not errors, '\n'.join(errors)
        assert page.locator('[data-r6-static-fallback="true"]').count()==0
        return {'pass':True,'quality':'medium','viewport':[430,932],'frames':result,'errors':errors}
    finally:
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
        screenshot(page,out/'forced-webgl-fallback.png')
        return {'pass':True}
    finally:
        context.close()


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:3000')
    parser.add_argument('--out',default='artifacts/cinematic/chapters')
    args=parser.parse_args()
    out=Path(args.out); out.mkdir(parents=True,exist_ok=True)
    report={'pass':False,'fpsSignOff':False,'highQualityDesktopAnimationSignOff':False,
        'renderer':'Full Chromium SwiftShader; posed visual proof and separate medium-tier navigation'}
    failures=[]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(channel='chromium',executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),
                headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
                                    '--enable-webgl','--ignore-gpu-blocklist'])
            try:
                report['browserVersion']=browser.version
                checks=[('fallback',lambda:fallback(browser,args.url,out)),
                        ('mobilePosed',lambda:capture(browser,args.url,out,'medium',430,932)),
                        ('desktopPosed',lambda:capture(browser,args.url,out,'high',1440,900)),
                        ('animatedMobile',lambda:animated_mobile_navigation(browser,args.url))]
                for name,check in checks:
                    try:
                        report[name]=check()
                    except Exception as error:
                        report[name]={'pass':False,'error':str(error)}
                        failures.append(name)
                    (out/'report.json').write_text(json.dumps(report,indent=2))
                report['pass']=not failures
            finally:
                browser.close()
    finally:
        (out/'report.json').write_text(json.dumps(report,indent=2))
    if failures:
        raise RuntimeError('Failed checks: '+', '.join(failures))
    print('Six-hero high/medium posed proof, revisits, mobile animation and forced fallback passed.')

if __name__=='__main__':
    main()
