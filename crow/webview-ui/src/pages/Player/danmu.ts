// @ts-ignore
import DanmuJs from 'danmu.js';

export default class Danmu {
  private instance = null;

  constructor(root: HTMLElement) {
    if (this.instance !== null) {
      return this.instance;
    }

    this.instance = new DanmuJs({
      container: root,
      area: {
        start: 0,
        end: 1,
      },
    });
  }

  public dealSpeed(speed: number) {
    let _speed = Math.floor(20000 / speed);
    if (_speed < 4000) {
      _speed = 4000;
    }
    return _speed;
  }

  public send(comment: string, speed: number = 1) {
    const _speed = this.dealSpeed(speed);
    // @ts-ignore
    this.instance?.sendComment({
      //发送弹幕
      duration: _speed,
      id: new Date().getTime(),
      txt: comment,
    });
  }

  public play() {
    // @ts-ignore
    this.instance?.play();
  }

  public pause() {
    // @ts-ignore
    this.instance?.pause();
  }

  public changeSpeed(speed: number) {
    const _speed = this.dealSpeed(speed);
    // @ts-ignore
    this.instance?.setAllDuration('top', _speed);
  }
}
