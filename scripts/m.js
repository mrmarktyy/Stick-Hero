/*globals DocumentTouch*/
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

var store = function store(key, value) {
  'use strict';
  var data;
  var IS_ANDROID = navigator.userAgent.toLowerCase().indexOf('android') > -1;
  var lsSupport = IS_ANDROID ? false : true;

  if (typeof value !== 'undefined' && value !== null) {
    if (typeof value === 'object' ) {
      value = JSON.stringify(value);
    }
    if (lsSupport) {
      localStorage.setItem(key, value);
    } else {
      createCookie(key, value, 100);
    }
  }

  if (typeof value === 'undefined') {
    if (lsSupport) {
      data = localStorage.getItem(key);
    } else {
      var cookieData = readCookie(key);
      data = cookieData !== null ? cookieData : localStorage.getItem(key);
    }
    try {
     data = JSON.parse(data);
    }
    catch(e) {
     data = data;
    }
    return data;
  }
  if (value === null) {
    if (lsSupport) {
      localStorage.removeItem(key);
    } else {
      createCookie(key, '', -1);
    }
  }
  function createCookie(key, value, exp) {
    var date = new Date();
    date.setTime(date.getTime() + (exp * 24 * 60 * 60 * 1000));
    var expires = '; expires=' + date.toGMTString();
    document.cookie = key + '=' + value + expires + '; path=/';
  }
  function readCookie(key) {
    var nameEQ = key + '=';
    var ca = document.cookie.split(';');
    for (var i = 0, max = ca.length; i < max; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
};

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
    var BOX_HEIGHT = Math.round(120 * HEIGHT_RATIO); //
    var STICK_WIDTH = 3;
    var STICK_LEFT = BOX_BASE_WIDTH - STICK_WIDTH;
    var STICK_BOTTOM = BOX_HEIGHT;
    var GAP = 4;
    var STICK_INC = 3;
    var PERFECT_WIDTH = 6;
    var UNLOCK_COUNT = 5;
    var FREE_DRAW = 3;
    var DRAW_SCORE = 20;
    var DRAW_TURNS = 10;
    var BOX_LEFT_MIN = BOX_BASE_WIDTH + 30;
    var BOX_LEFT_MAX = GAME_WIDTH - BOX_BASE_WIDTH;
    var BOX_WIDTH_MIN = Math.round(15 * WIDTH_RATIO); //
    var BOX_WIDTH_MAX = Math.round(69 * WIDTH_RATIO); //
    var ANIMATION_END_EVENTS = 'webkitTransitionEnd transitionend animationend webkitAnimationEnd';
    var TITLE_DEFAULT = '';
    var IS_TOUCHING = false;
    var PRESS_STARTED = false;
    var IS_WECHAT = !!navigator.userAgent.match(/MicroMessenger/);
    // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/touchevents.js#L40
    var IS_TOUCH = !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
    var CLICK_EVENT = IS_TOUCH ? 'touchstart' : 'click';
    var HERO_WIDTH;
    var HERO_HEIGHT;
    var HERO_FEET;
    var HERO_BOTTOM;
    var HERO_INIT_LEFT;
    // [width, height, feet_bottom, rest]
    var HEROS = [
      [18, 24, 10, 6], // 1 (care for 3px border)
      [18, 24, 5], [20, 18, 14],  // 1, 2, 3
      [18, 18, 7, 22, 11, 13], // 4
      [18, 24, 10, 20, 28, 10, 20], // 5
      [18, 24, 10, 28, 15, 32, 5], // 6
      [20, 24, 15, 3, 7, 11], // 7
      [18, 26, 8], // 8
      [21, 28, 8, 17, 13, 9, 6, 5, 16], // 9
      [18, 26, 7, 11 ,5], // 10
      [18, 24, 5], // 11
      [26, 26, 2, 14, 18, 30, 22, 12, 12, 22], // 12
      [24, 26, 13, 28, 24, 28, 15, 18, 15, 13, 24] // 13
    ];
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
    var LAST_STATE = STATES.DEAD;
    var PRIZES = [
      { level: 1, from: 270, per: 25, prize: 5, },
      { level: 2, from: 0,   per: 25, prize: 10, },
      { level: 3, from: 90,  per: 20, prize: 20, },
      { level: 4, from: 162, per: 15, prize: 50, },
      { level: 5, from: 216, per: 10, prize: 100, },
      { level: 6, from: 252, per: 5 , prize: 'hero13'}
    ];
    var PRIZE_HERO = 13;

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
      this.$ads = $('.ads');
      this.$ad = $('.ad').css({
        width: GAME_WIDTH + 'px'
      });
      this.$gametitle = $('.game-title');
      this.$gameover = $('.game-over');
      this.$welcome = $('.welcome');
      this.$heropick = $('.heropick');
      this.$draw = $('.draw');
      this.$drawTotal = $('.draw-total');
      this.$drawIcon = $('.btn-draw .icon');
      this.$drawPlate = $('.draw-plate');
      this.$drawResult = $('.draw-result');
      this.$drawPrize = $('.draw-prize');
      this.$newHeroIcon = $('.btn-hero .new');
      this.$share = $('.share');
      this.$livescore = $('.live-score');
      this.$watermelon = $('.watermelon');
      this.$instruction = $('.instruction');
      this.$about = $('.about');
      this.$perfect = $('.perfect');
      this.$score = $('.score');
      this.$best = $('.best');
      this.$total = $('.total');
      this.$movedStick = $('nothing');
      this._currentState = STATES.WELCOME;
      this.total = parseInt(store('total') || 0, 10);
      this.$total.text(this.total);
      this.isNew = store('stick-hero-404') + '' === 'true';
      this.gameRound = 0;

      this.heroInit();
      this.switchHero(this.hero);
      this.drawInit();
    };

    this.heroInit = function () {
      this.hero = store('hero') || 1;
      if (this.hero === 6) {
        this.hero = 1; // hero6 is deprecated
      }
      this.$heros = $('.hero-p');
      for (var i = 0; i < HEROS.length; i++) {
        var heroIndex = i + 1,
            unlocked = store('hero' + heroIndex) + '' === 'true',
            heroWidth = Math.round(HEROS[i][0] * WIDTH_RATIO),
            heroHeight = Math.round(HEROS[i][1] * WIDTH_RATIO),
            $hero = $('.hero' + heroIndex);

        if (heroIndex !== 1 && heroIndex !== 11 && unlocked) {
          $('.wrapper[data-src="' + heroIndex + '"]').removeClass('locked');
        }

        $hero.css({
          'width': heroWidth + 'px',
          'height': heroHeight + 'px'
        });
        if (heroIndex === 11 || heroIndex === 2 || heroIndex === 4) {
          $hero.find('.hat').css({'width': (heroWidth + 2) + 'px'});
        }
        if (heroIndex === 1) {
          $hero.find('.mouse').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px'
          });
        }
        if (heroIndex === 4) {
          $hero.find('.body').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px',
            'top': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px'
          });
        }
        if (heroIndex === 5) {
          $hero.find('.hair-up').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.hair-down').css({
            'width': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.ribbon').css({
            'border-right-width': Math.floor(HEROS[i][6] * WIDTH_RATIO) + 'px'
          });
        }
        if (heroIndex === 6) {
          $hero.find('.top').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.top-front').css({
            'width': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][6] * WIDTH_RATIO) + 'px'
          });
        }
        if (heroIndex === 7) {
          $hero.find('.hat1').css({'left': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px'});
          $hero.find('.hat2').css({'left': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px'});
          $hero.find('.hat3').css({'left': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px'});
        }
        if (heroIndex === 9) {
          $hero.find('.body').css({
            'width': heroWidth + 'px',
            'height': heroHeight + 'px',
            'border-radius': heroWidth +'px/' + heroHeight + 'px'
          });
          $hero.find('.head').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px',
            'border-radius': Math.floor(HEROS[i][3] * WIDTH_RATIO) +'px/' + Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px',
          });
          $hero.find('.heart').css({
            'width':  Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px',
            'left':  Math.ceil(HEROS[i][6] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.hand').css({
            'width': Math.floor(HEROS[i][7] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][8] * WIDTH_RATIO) + 'px'
          });
        }
        if (heroIndex === 10) {
          $hero.find('.mouse').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px',
            'border-radius': Math.floor(HEROS[i][3] * WIDTH_RATIO) +'px/' + Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px',
          });
        }
        if (heroIndex === 12) {
          $hero.find('.body').css({
            'width': heroWidth + 'px',
            'height': heroHeight + 'px'
          });
          $hero.find('.inside').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.head').css({
            'width': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px',
            'top': -Math.floor(HEROS[i][9] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.face').css({
            'width': Math.floor(HEROS[i][6] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][6] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.mouse').css({
            'width': Math.floor(HEROS[i][7] * WIDTH_RATIO) + 'px',
            'border-radius': '0px 0px ' + Math.floor(HEROS[i][7] * WIDTH_RATIO) + 'px ' + Math.floor(HEROS[i][7] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.m').css({
            'width': Math.floor(HEROS[i][8] * WIDTH_RATIO) + 'px'
          });
        }
        if (heroIndex === 13) {
          $hero.find('.body').css({
            'width': heroWidth + 'px',
            'height': heroHeight + 'px'
          });
          $hero.find('.head').css({
            'width': Math.floor(HEROS[i][3] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][4] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.half').css({
            'width': Math.floor(HEROS[i][5] * WIDTH_RATIO) + 'px',
            'height': Math.floor(HEROS[i][6] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.mouse').css({
            'top': Math.floor(HEROS[i][7] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.m').css({
            'width': Math.floor(HEROS[i][8] * WIDTH_RATIO) + 'px',
            'top': Math.floor(HEROS[i][9] * WIDTH_RATIO) + 'px'
          });
          $hero.find('.strip1, .strip2').css({
            'width': Math.floor(HEROS[i][10] * WIDTH_RATIO) + 'px'
          });
        }
      }

      if (!this.isNew) {
        this.$newHeroIcon.show();
      }
    };

    this.drawInit = function () {
      this.drawTotal = store('drawTotal');
      if (this.drawTotal === null) {
        this.drawTotal = FREE_DRAW;
      } else {
        this.drawTotal = parseInt(this.drawTotal, 10);
      }
      this.updateDraw();
    };

    this.switchHero = function (hero) {
      this.hero = parseInt(hero, 10) || this.hero;
      store('hero', this.hero);
      $('#wx_pic img').attr('src', 'images/hero' + this.hero + '.png?4');
      $('#wx_pic img').prop('src', 'images/hero' + this.hero + '.png?4');

      var HERO = HEROS[this.hero - 1];
      HERO_WIDTH = Math.round(HERO[0] * WIDTH_RATIO);
      HERO_HEIGHT = Math.round(HERO[1] * WIDTH_RATIO);
      HERO_FEET = HERO[2];
      HERO_BOTTOM = BOX_HEIGHT + HERO_FEET;
      HERO_INIT_LEFT = BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH;

      this.$heros.hide();
      this.$hero = $('.hero-p.hero' + this.hero)
        .css({
          'bottom': HERO_BOTTOM + 'px',
          'transform': 'translate3d(' + (GAME_WIDTH - HERO_WIDTH) / 2 + 'px, 0, 0)',
          '-webkit-transform': 'translate3d(' + (GAME_WIDTH - HERO_WIDTH) / 2 + 'px, 0, 0)'
        }).show();
      this.$feet = this.$hero.find('.foot');
    };

    this.bindEvents = function() {
      var self = this;
      $('.btn-play').on(CLICK_EVENT, function() {
        self.nextAfterAnimation(self.$gametitle, STATES.PRE_BEGIN);
        self.$gametitle.addClass('hinge');
      });
      $('.btn-playagain').on(CLICK_EVENT, function() {
        self.reset();
        self.next(STATES.PRE_BEGIN);
      });
      $('.btn-home').on(CLICK_EVENT, function() {
        self.reset();
        self.next(STATES.WELCOME);
      });
      $('.btn-share, .draw-share').on(CLICK_EVENT, function(event) {
        self.$share.show();
        self.$draw.removeClass('in');
        event.stopPropagation();
        $(document).off(CLICK_EVENT, '.overlay');
        $(document).on(CLICK_EVENT, '.overlay', function() {
          $(document).off(CLICK_EVENT, '.overlay');
          self.$share.hide();
        });
      });
      $('.btn-hero').on(CLICK_EVENT, function(event) {
        self.$heropick.toggleClass('in');
        self.$draw.removeClass('in');
        if (!this.isNew) {
          store('stick-hero-404', true);
          self.$newHeroIcon.hide();
        }
        event.stopPropagation();
        $(document).off(CLICK_EVENT, '.overlay');
        $(document).on(CLICK_EVENT, '.overlay', function() {
          $(document).off(CLICK_EVENT, '.overlay');
          self.$draw.removeClass('in');
          self.$heropick.removeClass('in');
        });
      });
      $('.btn-draw').on(CLICK_EVENT, function(event) {
        self.$draw.toggleClass('in');
        self.$heropick.removeClass('in');
        event.stopPropagation();
        $(document).off(CLICK_EVENT, '.overlay');
        $(document).on(CLICK_EVENT, '.overlay', function() {
          $(document).off(CLICK_EVENT, '.overlay');
          self.$heropick.removeClass('in');
          self.$draw.removeClass('in');
        });
      });
      $('.draw-btn').on(CLICK_EVENT, function () {
        event.stopPropagation();
        self.drawStart();
      });
      $(document).on(CLICK_EVENT, '.heropick .wrapper', function(event) {
        var $target = $(event.currentTarget),
            price = parseInt($target.data('price'), 10),
            hero = $target.data('src');
        if ($target.hasClass('locked')) {
          if (self.total >= price) {
            self.updateTotal(-price);
            self.unlockHero(hero);
          } else {
            event.preventDefault();
          }
        } else {
          self.switchHero(hero);
          $(document).off(CLICK_EVENT, '.overlay');
          self.$heropick.removeClass('in');
        }
        event.stopPropagation();
      });
      $(document).on('mousedown touchstart', function(event) {
        IS_TOUCHING = true;
        event.preventDefault();
      });
      $(document).on('mouseup touchend', function() {
        IS_TOUCHING = false;
      });
    };

    this.unlockHero = function (hero) {
      store('hero' + hero, true);
      $('.wrapper[data-src="' + hero + '"]').removeClass('locked');
    };

    this.reset = function() {
      this.score = 0;
      this.count = 0;
      this.isDrawing = false;
      this.gameRound ++;
      this.adf = false;
      this.best = store('best') || 0;
      this.$title.text(TITLE_DEFAULT);
      this.$heroContainer = this.$hero.parent();
      this.$game
        .removeClass('bounce bg1 bg2 bg3 bg4 bg5 bg6')
        .addClass('bg' + this._getRandom(1, 6));
      this.$gametitle.removeClass('hinge');
      this.$livescore.hide();
      this.$gameover.hide();
      this.$welcome.hide();
      this.$ad.hide();
      this.$ads.removeClass('adf');
      this.updateScore();

      $('.box, .stick').remove();
      this.BOX1 = { left: 0, width: BOX_BASE_WIDTH };
      this.$box1 = $('<div />').addClass('box init').css({
        'height': BOX_HEIGHT + 'px',
        'width': this.BOX1.width + 'px',
        'right': -this.BOX1.width + 'px',
        'transform': 'translate3d(' + -(GAME_WIDTH + this.BOX1.width) / 2 + 'px, 0, 0)',
        '-webkit-transform': 'translate3d(' + -(GAME_WIDTH + this.BOX1.width) / 2 + 'px, 0, 0)'
      });
      this.$hero.hide().css({
        'bottom': HERO_BOTTOM + 'px',
        'transform': 'translate3d(' + (GAME_WIDTH - HERO_WIDTH) / 2 + 'px, 0, 0)',
        '-webkit-transform': 'translate3d(' + (GAME_WIDTH - HERO_WIDTH) / 2 + 'px, 0, 0)'
      }).show();
      this.$game.append(this.$box1);

      if (this._getRandom(1, 100) <= 0) {
        this.adf = true;
      }
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
      this.$livescore.hide();
      this.$watermelon.hide();
      this.$heropick.show();
      this.$draw.show();
      this.$welcome.show();
    };

    this.preBegin = function() {
      this.$welcome.hide();
      this.$gameover.hide();
      this.$copyright.hide();
      this.$heropick.hide();
      this.$draw.hide();
      this.$livescore.show();
      this.$watermelon.show();
      this.$instruction.addClass('in');
      this.$title.text(TITLE_DEFAULT);

      this.BOX2 = this._createBox();
      this.$box2 = $('<div />').addClass('box').css({
        'height': BOX_HEIGHT + 'px',
        'width': this.BOX2.width + 'px',
        'right': -this.BOX2.width + 'px'
      });
      this.$game.append(this.$box2);
      this.nextAfterAnimation(this.$box2);

      this.$hero.css({
        'transform': 'translate3d(' + (BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH) + 'px, 0, 0)',
        '-webkit-transform': 'translate3d(' + (BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH) + 'px, 0, 0)'
      });
      this.$box1.css({
        'transform': 'translate3d(' + -GAME_WIDTH + 'px, 0, 0)',
        '-webkit-transform': 'translate3d(' + -GAME_WIDTH + 'px, 0, 0)'
      });
      var self = this;
      setTimeout(function() {
        self.$box2.css({
          'transform': 'translate3d(' + -(GAME_WIDTH - self.BOX2.left) + 'px, 0, 0)',
          '-webkit-transform': 'translate3d(' + -(GAME_WIDTH - self.BOX2.left) + 'px, 0, 0)'
        });
      }, 100);

      if (this.adf && this.gameRound > 1) {
        this.$ads.addClass('adf');
        this.$ad.show();
      }
    };

    this.begin = function() {
      this._activeStickHeight = 0;
      this._validStickMin = this.BOX2.left - BOX_BASE_WIDTH;
      this._validStickMax = this._validStickMin + this.BOX2.width;

      $('.plus-one').remove();
      this.$activeStick = $('<div />')
        .addClass('stick')
        .css({
          left: STICK_LEFT + 'px',
          bottom: STICK_BOTTOM + 'px'
        });
      this.$game.append(this.$activeStick);

      var self = this;
      PRESS_STARTED = false;
      IS_TOUCHING = false;
      (function loop() {
        if ((PRESS_STARTED && IS_TOUCHING) || (!PRESS_STARTED)) {
          window.requestAnimationFrame(loop);
        }
        if (IS_TOUCHING) {
          if (!PRESS_STARTED) {
            self.$heroContainer.addClass('shake');
            self.$instruction.removeClass('in');
            PRESS_STARTED = true;
          }
          self._activeStickHeight += STICK_INC;
          self.$activeStick[0].style.height = self._activeStickHeight + 'px';
          // self.$activeStick.css({height: self._activeStickHeight + 'px'});
        }
        if (!IS_TOUCHING && PRESS_STARTED) {
          self.next();
        }
      })();
    };

    this.stickRotation = function() {
      this.nextAfterAnimation(this.$activeStick);

      this.$heroContainer.removeClass('shake');
      this.$activeStick
        .css({
          'transition-duration': '0.4s',
          '-webkit-transition-duration': '0.4s',
          'transition-timing-function': 'ease-in',
          '-webkit-transition-timing-function': 'ease-in'
        }).addClass('rotate');
    };

    this.heroWalk = function() {
      this.dx = this.BOX2.left + this.BOX2.width - BOX_BASE_WIDTH;

      if (this._activeStickHeight > this._validStickMin && this._activeStickHeight < this._validStickMax) {
        this.nextAfterAnimation(this.$hero, STATES.SHIFTING);

        this._perfectMin = this._validStickMin + (this.BOX2.width - PERFECT_WIDTH) / 2;
        this._perfectMax = this._perfectMin + PERFECT_WIDTH;
        this.inc = 1;
        // if pecfect
        if (this._activeStickHeight >= this._perfectMin && this._activeStickHeight <= this._perfectMax) {
          this.inc = 2;
          this.count ++;
          this.$perfect.addClass('in');
          var $plus = $('<div />').addClass('plus-one').css({
            'left': this.BOX2.left + ((this.BOX2.width - 14) / 2) + 'px',
            'bottom': BOX_HEIGHT + 10 + 'px'
          }).text('+1');
          this.$game.append($plus);
          setTimeout(function () {
            $plus.addClass('out');
          }, 100);
          if (this.count >= UNLOCK_COUNT) {
            this.unlockHero(5);
          }
        } else {
          this.count = 0;
        }

        this.$hero.css({
          'transform': 'translate3d(' + (this.BOX2.left + this.BOX2.width - HERO_WIDTH - GAP - STICK_WIDTH) + 'px, 0, 0)',
          '-webkit-transform': 'translate3d(' + (this.BOX2.left + this.BOX2.width - HERO_WIDTH - GAP - STICK_WIDTH) + 'px, 0, 0)',
          'transition-duration': this.dx / 225 + 's',
          '-webkit-transition-duration': this.dx / 225 + 's',
          'transition-timing-function': 'linear',
          '-webkit-transition-timing-function': 'linear'
        });
      } else {
        this.nextAfterAnimation(this.$hero, STATES.DYING);

        var duration = (GAP + HERO_WIDTH + this._activeStickHeight) / 225;
        duration = duration > 1 ? 1 : duration;
        this.$hero.css({
          'transform': 'translate3d(' + (BOX_BASE_WIDTH + this._activeStickHeight) + 'px, 0, 0)',
          '-webkit-transform': 'translate3d(' + (BOX_BASE_WIDTH + this._activeStickHeight) + 'px, 0, 0)',
          'transition-duration': duration + 's',
          '-webkit-transition-duration': duration + 's',
          'transition-timing-function': 'linear',
          '-webkit-transition-timing-function': 'linear'
        });
      }
      this.$feet.addClass('walk');
      this.$activeStick.css({
        'transition-duration': '',
        '-webkit-transition-duration': '',
        'transition-timing-function': '',
        '-webkit-transition-timing-function': ''
      });
    };

    this.shifting = function() {
      this.nextAfterAnimation(this.$hero, STATES.UPDATE);

      var self = this;
      this.$feet.removeClass('walk').css('opacity', 0.9);
      setTimeout(function () {
        self.$feet.css('opacity', 1);
      }, 0);
      this.$perfect.removeClass('in');
      this.$hero.css({
        'transform': 'translate3d(' + (BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH) + 'px, 0, 0)',
        '-webkit-transform': 'translate3d(' + (BOX_BASE_WIDTH - HERO_WIDTH - GAP - STICK_WIDTH) + 'px, 0, 0)',
        'transition-duration': '',
        '-webkit-transition-duration': '',
        'transition-timing-function': '',
        '-webkit-transition-timing-function': ''
      });
      // Off Screen
      this.$box1.css({
        'transform': 'translate3d(' + -(this.dx + GAME_WIDTH) + 'px, 0, 0)',
        '-webkit-transform': 'translate3d(' + -(this.dx + GAME_WIDTH) + 'px, 0, 0)'
      });
      this.$box2.css({
        'transform': 'translate3d(' + -(GAME_WIDTH - BOX_BASE_WIDTH + this.BOX2.width) + 'px, 0, 0)',
        '-webkit-transform': 'translate3d(' + -(GAME_WIDTH - BOX_BASE_WIDTH + this.BOX2.width) + 'px, 0, 0)'
      });
      // Off Screen
      this.$movedStick.css({
        'transform': 'translate3d(' + -(this.dx + GAME_WIDTH) + 'px, 0, 0) rotate(90deg)',
        '-webkit-transform': 'translate3d(' + -(this.dx + GAME_WIDTH) + 'px, 0, 0) rotate(90deg)'
      });

      this.BOX3 = this._createBox();
      this.$box3 = $('<div />').addClass('box').css({
        'height': BOX_HEIGHT + 'px',
        'width': this.BOX3.width + 'px',
        'right': -this.BOX3.width + 'px'
      });
      this.$game.append(this.$box3);

      setTimeout(function() {
        self.$box3.css({
          'transform': 'translate3d(' + -(GAME_WIDTH - self.BOX3.left) + 'px, 0, 0)',
          '-webkit-transform': 'translate3d(' + -(GAME_WIDTH - self.BOX3.left) + 'px, 0, 0)'
        });
      }, 100);

      this.$activeStick.css({
        'transform': 'translate3d(' + -this.dx + 'px, 0, 0) rotate(90deg)',
        '-webkit-transform': 'translate3d(' + -this.dx + 'px, 0, 0) rotate(90deg)'
      });
    };

    this.dying = function() {
      this.nextAfterAnimation(this.$hero, STATES.DEAD);

      this.$hero.css({
        'transform': 'translate3d(' + (BOX_BASE_WIDTH + this._activeStickHeight) + 'px, ' + (BOX_HEIGHT + HERO_HEIGHT + 50) + 'px , 0)',
        '-webkit-transform': 'translate3d(' + (BOX_BASE_WIDTH + this._activeStickHeight) + 'px, ' + (BOX_HEIGHT + HERO_HEIGHT + 50) + 'px , 0)',
        'transition-duration': '0.2s',
        '-webkit-transition-duration': '0.2s',
        'transition-timing-function': '',
        '-webkit-transition-timing-function': ''
      });
      this.$feet.removeClass('walk');
      this.$activeStick.addClass('died');

      if (IS_WECHAT) {
        this.$title.text('棍子大侠:我总共前进了' + this.score + '步,听说智商超过130的人才能前进40步哦,你也来试试？');
      }
      var drawCount = Math.floor(this.score / DRAW_SCORE);
      if (drawCount) {
        this.updateDraw(drawCount);
      }
    };

    this.update = function() {
      this.updateScore(this.inc);
      this.updateTotal(1);

      this.$box1.remove();
      this.$box1 = this.$box2;
      this.BOX1 = this.BOX2;
      this.$box2 = this.$box3;
      this.BOX2 = this.BOX3;

      this.$movedStick.remove();
      this.$movedStick = this.$activeStick;

      this.next(STATES.BEGIN);
    };

    this.dead = function() {
      if (this._getRandom(1, 100) <= 70) {
        setTimeout(function() {
          window.GDT.showWindow();
          $('a.icon_close').on(CLICK_EVENT, function() {
            window.GDT.closeWindow();
          });
        }, 200);
      }
      this.$livescore.hide();
      this.$gameover.show();
      this.$game.addClass('bounce');
      this.$hero.css({
        'transition-duration': '',
        '-webkit-transition-duration': ''
      });
    };

    this.drawStart = function () {
      var self = this;
      if (this.isDrawing) {
        return;
      }
      if (this.drawTotal <= 0) {
        // FIXME: Add message
        return;
      }
      var deg = this._getRandom(0, 359);
      var angle = 360 * DRAW_TURNS - deg;
      this.$drawPlate.on(ANIMATION_END_EVENTS, function() {
        self.$drawPlate.off(ANIMATION_END_EVENTS);
        self.drawEnd(deg);
      });
      this.isDrawing = true;
      this.updateDraw(-1);
      this.$drawResult.removeClass('in');
      this.$drawPlate.addClass('start').css({
        '-webkit-transform': 'rotate(' + angle + 'deg)',
        'transform': 'rotate(' + angle + 'deg)',
      });
    };

    this.drawEnd = function (deg) {
      this.isDrawing = false;
      var prize = this.getPrize(deg);
      this.$drawPrize.text(prize);
      this.$drawResult.addClass('in');
      if (IS_WECHAT) {
        this.$title.text('棍子大侠:太厉害了，我在幸运抽奖中抽到了' + prize + '！你也来试试吧！');
      }
      this.$drawPlate.removeClass('start').css({
        '-webkit-transform': 'rotate(' + -deg + 'deg)',
        'transform': 'rotate(' + -deg + 'deg)'
      });
    };

    this.getPrize = function (deg) {
      var prize;
      for (var i = 0; i < PRIZES.length; i++) {
        if (PRIZES[i].from <= deg && deg < (PRIZES[i].from + PRIZES[i].per * 360 / 100)) {
          if (typeof PRIZES[i].prize === 'number') {
            this.updateTotal(PRIZES[i].prize);
            prize = PRIZES[i].prize + '个西瓜';
            return prize;
          } else {
            this.unlockHero(PRIZE_HERO);
            prize = '隐藏英雄！';
            return prize;
          }
        }
      }
    };

    this.updateScore = function (n) {
      if (n !== undefined) {
        this.score += n;
      }
      if (this.best < this.score) {
        this.best = this.score;
        store('best', this.best);
      }
      this.$livescore.text(this.score);
      this.$score.text(this.score);
      this.$best.text(this.best);
    };

    this.updateTotal = function (n) {
      if (n !== undefined) {
        this.total += n;
      }
      store('total', this.total);
      this.$total.text(this.total);
    };

    this.updateDraw = function (n) {
      if (n !== undefined) {
        this.drawTotal += n;
      }
      store('drawTotal', this.drawTotal);
      this.$drawTotal.text(this.drawTotal);
      if (this.drawTotal > 0) {
        this.$drawIcon.show();
      } else {
        this.$drawIcon.hide();
      }
    };

    this._createBox = function() {
      return {
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
