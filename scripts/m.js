(function() {
  'use strict';
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() {
          callback(currTime + timeToCall);
        },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
}());

$(function() {
  'use strict';

  function Game(options) {

    this.options = options || {};
    var GAME_DEFAULT_WIDTH = 320;
    var GAME_DEFAULT_HEIGHT = 480;
    var GAME_WIDTH = this.options.width || GAME_DEFAULT_WIDTH;
    var GAME_HEIGHT = this.options.height || GAME_DEFAULT_HEIGHT;
    var WIDTH_RATIO = GAME_WIDTH / GAME_DEFAULT_WIDTH;
    var HEIGHT_RATIO = GAME_HEIGHT / GAME_DEFAULT_HEIGHT;
    var BOX_BASE_WIDTH = Math.round(50 * WIDTH_RATIO); //
    var BOX_HEIGHT = Math.round(100 * HEIGHT_RATIO); //
    var STICK_WIDTH = 3;
    var STICK_LEFT = BOX_BASE_WIDTH - STICK_WIDTH;
    var STICK_BOTTOM = BOX_HEIGHT;
    var GAP = 4;
    var STICK_INIT_LEFT = BOX_BASE_WIDTH - STICK_WIDTH;
    var BOX_LEFT_MIN = BOX_BASE_WIDTH + 20;
    var BOX_LEFT_MAX = GAME_WIDTH - BOX_BASE_WIDTH;
    var BOX_WIDTH_MIN = Math.round(15 * WIDTH_RATIO); //
    var BOX_WIDTH_MAX = Math.round(69 * WIDTH_RATIO); //
    var STICK_INC = 3;
    var ANIMATION_END_EVENTS = 'transitionend webkitTransitionEnd animationend webkitAnimationEnd MSAnimationEnd oAnimationEnd';
    var TITLE_DEFAULT = '';
    var IS_TOUCHING = false;
    var PRESS_STARTED = false;
    var IS_WECHAT = !!navigator.userAgent.match(/MicroMessenger/);
    var HERO_WIDTH; //
    var HERO_HEIGHT; //
    var HERO_HAT;
    var HERO_FEET;
    var HERO_BOTTOM;
    var HERO_INIT_LEFT;
    var HEROS = [[18, 24, 5],[18, 24, 5]];  // [width, height, feet_height]
    var STATES = {
      WELCOME: 0,
      PRE_BEGIN: 1,
      BEGIN: 2,
      STICK_ROTATION: 3,
      HERO_WALK: 4,
      SHIFTING: 5,
      DYING: 6,
      UPDATE: 7,
      DEAD: 8
    };
    var LAST_STATE = Object.keys(STATES).length - 1;

    this.init = function() {
      this.initVars();
      this.bindEvents();
      this.reset();
    };

    this.initVars = function() {
      this.$title = $('title');
      TITLE_DEFAULT = this.$title.text();
      this.$copyright = $('.copyright');
      this.$game = $('#game').css({
        width: GAME_WIDTH + 'px',
        height: GAME_HEIGHT + 'px'
      });
      this.$gamename = $('.game-name');
      this.$gameover = $('.game-over');
      this.$welcome = $('.welcome');
      this.$heropick = $('.heropick');
      this.$share = $('.share');
      this.$liveScore = $('.live-score');
      this.$watermelon = $('.watermelon');
      this.$instruction = $('.instruction');
      this.$score = $('.score');
      this.$best = $('.best');
      this.$total = $('.total');
      this.$movedStick = $('nothing');
      this._currentState = STATES.WELCOME;
      this.total = localStorage.getItem('total') || 0;
      this.$total.text(this.total);

      this.heroInit();
      this.switchHero(this.hero);
    };

    this.heroInit = function () {
      this.hero = localStorage.getItem('hero') || 1;
      this.$heros = $('.hero > .hero1, .hero > .hero2');
      for (var i = 0; i < HEROS.length; i++) {
        $('.hero' + (i+1)).css({
          width: Math.round(HEROS[i][0] * WIDTH_RATIO) + 'px',
          height: Math.round(HEROS[i][1] * WIDTH_RATIO) + 'px'
        });
      }
    };

    this.switchHero = function (hero) {
      this.hero = parseInt(hero, 10) || this.hero;
      localStorage.setItem('hero', this.hero);

      var HERO = HEROS[this.hero -1];
      HERO_WIDTH = Math.round(HERO[0] * WIDTH_RATIO);
      HERO_HEIGHT = Math.round(HERO[1] * WIDTH_RATIO);
      HERO_HAT = HERO_WIDTH + 2;
      HERO_FEET = HERO[2];
      HERO_BOTTOM = BOX_HEIGHT + HERO_FEET;
      HERO_INIT_LEFT = BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH;

      this.$heros.hide();
      this.$hero = $('.hero > .hero' + this.hero)
        .css({
          bottom: HERO_BOTTOM + 'px',
          left: (GAME_WIDTH - HERO_WIDTH) / 2 + 'px'
        }).show();
      this.$hat = this.$hero.find('.hat').css({
        width: HERO_HAT + 'px'
      });
      this.$feet = this.$hero.find('.foot');
      $('.wrapper').removeClass('selected');
      $('.wrapper[data-src="' + this.hero + '"]').addClass('selected');
    };

    this.bindEvents = function() {
      var self = this;
      $(document).on('click touchstart', '.btn-play', function() {
        self.nextAfterAnimation(self.$gamename, STATES.PRE_BEGIN);
        self.$gamename.addClass('hinge');
      });
      $(document).on('click touchstart', '.btn-playagain', function() {
        self.reset();
        self.next(STATES.PRE_BEGIN);
      });
      $(document).on('click touchstart', '.btn-share', function() {
        self.$share.show();
      });
      $(document).on('click touchstart', '.btn-hero', function() {
        self.$heropick.addClass('in');
      });
      $(document).on('click touchstart', '.heropick .wrapper', function(event) {
        self.switchHero($(event.currentTarget).data('src'));
      });
      $(document).on('click touchstart', '.share.overlay, .heropick.overlay', function() {
        self.$share.hide();
        self.$heropick.removeClass('in');
      });
      $(document).on('mousedown touchstart', function(event) {
        IS_TOUCHING = true;
        event.preventDefault();
      });
      $(document).on('mouseup touchend', function() {
        IS_TOUCHING = false;
      });
    };

    this.reset = function() {
      this.score = 0;
      this.best = localStorage.getItem('best') || 0;
      this.$title.text(TITLE_DEFAULT);
      this.$heroContainer = this.$hero.parent();
      this.$game
        .removeClass('bounce bg1 bg2 bg3 bg4 bg5')
        .addClass('bg' + this._getRandom(1, 5));
      this.$liveScore.hide();
      this.$gameover.hide();
      this.$welcome.hide();
      this.updateScore();

      $('.box, .stick').remove();
      this.$box1 = $('<div />').addClass('box').css({
        height: BOX_HEIGHT + 'px',
        left: (GAME_WIDTH - BOX_BASE_WIDTH) / 2 + 'px',
        width: BOX_BASE_WIDTH + 'px'
      });
      this.$hero.css({
        bottom: HERO_BOTTOM + 'px',
        left: (GAME_WIDTH - HERO_WIDTH) / 2 + 'px'
      });
      this.$game.append(this.$box1);
    };

    this.start = function() {
      this.welcome();
    };

    this.next = function(state) {
      if (state !== void 0) {
        this._currentState = state;
      } else if (this._currentState === LAST_STATE) {
        this._currentState = 0;
      } else {
        this._currentState++;
      }
      var funcName = camelCase(getKey(STATES, this._currentState));
      if (typeof this[funcName] === 'function') {
        this[funcName].call(this);
      }
    };

    this.nextAfterAnimation = function($elm, state) {
      var self = this;
      $elm.on(ANIMATION_END_EVENTS, function() {
        $elm.off(ANIMATION_END_EVENTS);
        self.next(state);
      });
    };

    this.welcome = function() {
      this.$gameover.hide();
      this.$liveScore.hide();
      this.$watermelon.hide();
      this.$welcome.show();
    };

    this.preBegin = function() {
      this.$welcome.hide();
      this.$gameover.hide();
      this.$copyright.hide();
      this.$liveScore.show();
      this.$watermelon.show();

      this._createBox();
      this.$box2 = $('<div />').addClass('box').css({
        height: BOX_HEIGHT + 'px',
        width: this._newBox.width + 'px',
        left: '200%'
      });
      this.$game.append(this.$box2.hide().show(0));
      this.nextAfterAnimation(this.$box2);

      this.$hero.css({ left: (BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH) + 'px' });
      this.$box1.css({ left: 0 });
      this.$instruction.addClass('in');

      var self = this;
      setTimeout(function() {
        self.$box2.css({left: self._newBox.left + 'px'});
      }, 0);
    };

    this.begin = function() {
      this._activeStickHeight = 0;
      this._validStickMin = this._newBox.left - BOX_BASE_WIDTH;
      this._validStickMax = this._validStickMin + this._newBox.width;

      this.$activeStick = $('<div />')
        .addClass('stick')
        .css({
          left: STICK_LEFT + 'px',
          bottom: STICK_BOTTOM + 'px'
        });
      this.$game.append(this.$activeStick);

      var self = this;
      PRESS_STARTED = false;
      (function loop() {
        if ((PRESS_STARTED && IS_TOUCHING) || (!PRESS_STARTED)) {
          window.requestAnimationFrame(loop);
        }

        if (IS_TOUCHING) {
          if (!PRESS_STARTED) {
            self.$heroContainer.addClass('shake');
            self.$instruction.removeClass('in');
          }
          self._activeStickHeight += STICK_INC;
          self.$activeStick.css({height: self._activeStickHeight + 'px'});
          PRESS_STARTED = true;
        }
        if (!IS_TOUCHING && PRESS_STARTED) {
          self.next();
        }
      })();
    };

    this.stickRotation = function() {
      this.nextAfterAnimation(this.$activeStick);

      this.$heroContainer.removeClass('shake');
      this.$activeStick.addClass('rotate');
    };

    this.heroWalk = function() {
      this.$feet.addClass('walk');

      this.dx = this._newBox.left + this._newBox.width - BOX_BASE_WIDTH;
      if (this._activeStickHeight > this._validStickMin &&
        this._activeStickHeight < this._validStickMax) {
        this.nextAfterAnimation(this.$hero, STATES.SHIFTING);

        this.$hero.css({left: HERO_INIT_LEFT + this.dx + 'px'});
        this.$hero[0].style['transition-duration'] = this.dx / 225 + 's';
        this.$hero[0].style['transition-timing-function'] = 'linear';
      } else {
        this.nextAfterAnimation(this.$hero, STATES.DYING);

        this.$hero.css({left: HERO_INIT_LEFT + GAP + HERO_WIDTH + this._activeStickHeight + 'px'});
        this.$hero[0].style['transition-duration'] = (GAP + HERO_WIDTH + this._activeStickHeight) / 225 + 's';
        this.$hero[0].style['transition-timing-function'] = 'linear';
      }
    };

    this.shifting = function() {
      this.nextAfterAnimation(this.$hero, STATES.UPDATE);

      this._createBox();
      this.$feet.removeClass('walk');
      this.$hero[0].style['transition-duration'] = '';
      this.$hero[0].style['transition-timing-function'] = '';
      this.$hero.css('left', parseInt(this.$hero.css('left'), 10) - this.dx + 'px');
      this.$box1.css('left', parseInt(this.$box1.css('left'), 10) - this.dx + 'px');
      this.$box2.css('left', parseInt(this.$box2.css('left'), 10) - this.dx + 'px');
      this.$movedStick.css('left', parseInt(this.$movedStick.css('left'), 10) - this.dx + 'px');
      this.$box3 = $('<div />').addClass('box').css({
        height: BOX_HEIGHT + 'px',
        width: this._newBox.width + 'px',
        left: '200%'
      });
      this.$game.append(this.$box3);

      var self = this;
      setTimeout(function() {
        self.$box3.css('left', self._newBox.left + 'px');
      }, 0);

      this.$activeStick.css('left', STICK_INIT_LEFT - this.dx + 'px');
    };

    this.dying = function() {
      this.nextAfterAnimation(this.$hero, STATES.DEAD);

      this.$hero[0].style['transition-duration'] = '';
      this.$hero[0].style['transition-timing-function'] = '';
      this.$hero.css('bottom', -(HERO_HEIGHT + 20) + 'px');
      this.$feet.removeClass('walk');
      this.$activeStick.addClass('died');
    };

    this.update = function() {
      this.score++;
      this.total++;
      this.updateScore();

      this.$box1.remove();
      this.$box1 = this.$box2;
      this.$box2 = this.$box3;

      this.$movedStick.remove();
      this.$movedStick = this.$activeStick;

      this.next(STATES.BEGIN);
    };

    this.dead = function() {
      this.$liveScore.hide();
      this.$gameover.show();
      this.$game.addClass('bounce');
      if (IS_WECHAT) {
        this.$title.text(TITLE_DEFAULT + ': ' + '我一不小心就前进了' + this.score + '步，你敢挑战我吗？小伙伴们快来一起玩耍吧！');
      }
    };

    this.updateScore = function() {
      if (this.best < this.score) {
        this.best = this.score;
        localStorage.setItem('best', this.best);
      }

      localStorage.setItem('total', this.total);
      this.$total.text(this.total);
      this.$liveScore.text(this.score);
      this.$score.text(this.score);
      this.$best.text(this.best);
    };

    this._createBox = function() {
      this._newBox = {
        left: this._getRandom(BOX_LEFT_MIN, BOX_LEFT_MAX),
        width: this._getRandom(BOX_WIDTH_MIN, BOX_WIDTH_MAX)
      };
    };

    this._getRandom = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    this.init();

    return this;
  }

  function getKey(object, value) {
    for (var prop in object) {
      if (object.hasOwnProperty(prop) && object[prop] === value) {
        return prop;
      }
    }
  }

  function camelCase(input) {
    if (input) {
      return input.toLowerCase().replace(/_(.)/g, function(match, d) {
        return d.toUpperCase();
      });
    }
  }

  var viewportWidth = $(window).width();
  var viewportHeight = $(window).height();
  var options = {};
  if (viewportWidth < viewportHeight && viewportWidth < 500) {
    options.width = viewportWidth;
    options.height = viewportHeight;
  }

  new Game(options).start();

});
