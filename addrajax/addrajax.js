/* ================================================================ *
    ajaxzip2.js ---- ADDRAjax Ajaxによる住所ドリルダウン検索 

    Copyright (c) 2006-2007 Kawasaki Yusuke <u-suke [at] kawa.net>
    http://www.kawa.net/works/ajax/ajaxzip2/ajaxzip2.html

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
* ================================================================ */

ADDRAjax = function (fpref,fcity,farea) {
    if ( fpref ) this.form_pref = fpref;
    if ( fcity ) this.form_city = fcity;
    if ( farea ) this.form_area = farea;
};
ADDRAjax.VERSION = '2.11';

// デフォルト値
ADDRAjax.prototype.JSONDATA = 'addrajax/data';
ADDRAjax.prototype.URL_SUFFIX = '';
ADDRAjax.prototype.form_pref = 'pref';
ADDRAjax.prototype.form_city = 'city';
ADDRAjax.prototype.form_area = 'area';
ADDRAjax.prototype.onChange = function(pref,city,area){};

// 都道府県名の一覧
ADDRAjax.prototype.PREF_MAP = [
    null,       '北海道',   '青森県',   '岩手県',   '宮城県',   
    '秋田県',   '山形県',   '福島県',   '茨城県',   '栃木県',   
    '群馬県',   '埼玉県',   '千葉県',   '東京都',   '神奈川県', 
    '新潟県',   '富山県',   '石川県',   '福井県',   '山梨県',   
    '長野県',   '岐阜県',   '静岡県',   '愛知県',   '三重県',   
    '滋賀県',   '京都府',   '大阪府',   '兵庫県',   '奈良県',   
    '和歌山県', '鳥取県',   '島根県',   '岡山県',   '広島県',   
    '山口県',   '徳島県',   '香川県',   '愛媛県',   '高知県',   
    '福岡県',   '佐賀県',   '長崎県',   '熊本県',   '大分県',   
    '宮崎県',   '鹿児島県', '沖縄県'
];

// キャッシュ格納用
ADDRAjax.prototype.JSON_CACHE = [];

// 都道府県名→都道府県IDの逆変換表
new function(){
    var rev = {};
    var map = ADDRAjax.prototype.PREF_MAP;
    for( var i=0; i<map.length; i++ ) {
        if ( ! map[i] ) continue;
        rev[map[i]] = i;
    }
    ADDRAjax.prototype.PREF_REV = rev;
};

// 初期化
ADDRAjax.prototype.init = function () {
    // フォームの各変数を検索
    var apref = document.getElementsByName( this.form_pref );
    var acity = document.getElementsByName( this.form_city );
    var aarea = document.getElementsByName( this.form_area );
    if ( ! apref ) return;
    if ( ! acity ) return;
    if ( ! aarea ) return;

    // フォームの各変数を確認
    this.elem_pref = apref[0];
    this.elem_city = acity[0];
    this.elem_area = aarea[0];
    if ( ! this.elem_pref ) return;
    if ( ! this.elem_city ) return;
    if ( ! this.elem_area ) return;

    // 初回に1度だけ使用するコールバック関数
    this.onceAfterPref = null;
    this.onceAfterCity = null;
    this.onceAfterArea = null;

    // 都道府県名のプルダウンを初期化
    this.initSelectList( this.elem_pref, this.PREF_MAP );
    this.initSelectList( this.elem_city, [] );
    this.initSelectList( this.elem_area, [] );

    // イベントハンドラの登録
    var __this = this;
    if ( window.Event && Event.observe ) {
        Event.observe( this.elem_pref, 'change', function(){__this.onChangePref();} );
        Event.observe( this.elem_city, 'change', function(){__this.onChangeCity();} );
        Event.observe( this.elem_area, 'change', function(){__this.onChangeArea();} );
    }
    else if ( window.jQuery ) {
        jQuery( this.elem_pref ).bind( 'change', function(){__this.onChangePref();} );
        jQuery( this.elem_city ).bind( 'change', function(){__this.onChangeCity();} );
        jQuery( this.elem_area ).bind( 'change', function(){__this.onChangeArea();} );
    }
};

// プルダウンの初期化
ADDRAjax.prototype.initSelectList = function ( elem, list, defval ) {
    var opts = elem.options;
    for( var i=opts.length; i>0; i-- ) {
        if ( ! opts[i] ) continue;
        opts[i].parentNode.removeChild( opts[i] );
    }
    if ( list.length ) {
        elem.disabled = false;
    } else {
        elem.disabled = true;
    }
    for( var i=0; i<list.length; i++ ) {
        var str = list[i];
        if ( ! str ) continue;
        if ( typeof(str) == 'object' ) str = str[1];
        var eopt = document.createElement( 'option' );
        elem.appendChild( eopt );
        eopt.text  = str;
        eopt.value = str;
        if ( str == defval ) eopt.selected = true;
    }
}

// プルダウンの値を取得する
ADDRAjax.prototype.getSelectValue = function (elem) {
    var opts = elem.options;
    if ( ! opts ) return;
    for( var i=0; i<opts.length; i++ ) {
        if ( opts[i].selected ) return opts[i].value;
    }
};
ADDRAjax.prototype.getPrefValue = function () {
    return this.getSelectValue( this.elem_pref );
};
ADDRAjax.prototype.getCityValue = function () {
    return this.getSelectValue( this.elem_city );
};
ADDRAjax.prototype.getAreaValue = function () {
    return this.getSelectValue( this.elem_area );
};

// プルダウンの値を選択する
ADDRAjax.prototype.setSelectValue = function (elem,value) {
    if ( ! elem ) return;
    var opts = elem.options;
    if ( ! opts ) return;
    for( var i=0; i<opts.length; i++ ) {
        opts[i].selected = false;
    }
    for( var i=0; i<opts.length; i++ ) {
        if ( opts[i].value == value ) {
            opts[i].selected = true;
        }
    }
};

// Safariの文字化け防止
ADDRAjax.prototype.getResponseText = function ( req ) {
    var text = req.responseText;
    if ( navigator.appVersion.indexOf('KHTML') > -1 ) {
        var esc = escape( text );
        if ( esc.indexOf('%u') < 0 && esc.indexOf('%') > -1 ) {
            text = decodeURIComponent( esc );
        }
    }
    return text;
};

// 都道府県の選択時に呼ばれるイベント
ADDRAjax.prototype.onChangePref = function () {
    var vpref = this.getPrefValue();

    var __this = this;
    var prefcb = function (data) {
        if ( __this.onceAfterPref ) {
            __this.onceAfterPref( vpref, '', '' );
            __this.onceAfterPref = null;
        } else if ( __this.onChange ) {
            __this.onChange( vpref, '', '' );
        }
    };

    if ( ! vpref ) {
        this.initSelectList( this.elem_city, [] );
        this.initSelectList( this.elem_area, [] );
        window.setTimeout( prefcb, 1 );
        return;
    }
    var prefid = this.PREF_REV[vpref];
    if ( ! prefid ) return;

    var updateCityList = function (data) {
        __this.initSelectList( __this.elem_city, data[2] );
        __this.initSelectList( __this.elem_area, [] );
        window.setTimeout( prefcb, 1 );
    };

    var data = this.JSON_CACHE[prefid];
    if ( data ) return updateCityList( data );

    // JSONファイル名を決定する
    var pref2 = ''+prefid;
    if ( pref2.length < 2 ) pref2 = '0' + pref2;
    var url = this.JSONDATA+'/pref-'+pref2+'.json'+this.URL_SUFFIX;

    if ( window.Ajax && Ajax.Request ) {
        // JSONファイル受信後のコールバック関数（Prototype.JS用）
        var recv_prototype = function (req) {
            if ( ! req ) return;
            if ( ! req.responseText ) return;
            var json = __this.getResponseText( req );
            data = eval('('+json+')');
            __this.JSON_CACHE[prefid] = data;
            updateCityList( data );
        };
        var opt = {
            method: 'GET',
            asynchronous: true,
            onComplete: recv_prototype
        };
        new Ajax.Request( url, opt );
    }
    else if ( window.jQuery ) {
        // JSONファイル受信後のコールバック関数（jQuery用）
        var recv_jquery = function (data) {
            __this.JSON_CACHE[prefid] = data;
            updateCityList( data );
        };

        jQuery.getJSON( url, recv_jquery );
    }
};

// 市区町村の選択時に呼ばれるイベント
ADDRAjax.prototype.onChangeCity = function () {
    var vpref = this.getPrefValue();
    if ( ! vpref ) return;
    var prefid = this.PREF_REV[vpref];
    if ( ! prefid ) return;
    var data = this.JSON_CACHE[prefid];
    if ( ! data ) return;
    var vcity = this.getCityValue();
    if ( ! vcity ) return;
    for( var i=0; i<data[2].length; i++ ) {
        if ( data[2][i][1] == vcity ) {
            this.initSelectList( this.elem_area, data[2][i][2] );
        }
    }
    var __this = this;
    var citycb = function () {
        if ( __this.onceAfterCity ) {
            __this.onceAfterCity( vpref, vcity, '' );
            __this.onceAfterCity = null;
        } else if ( __this.onChange ) {
            __this.onChange( vpref, vcity, '' );
        }
    };
    window.setTimeout( citycb, 1 );
};

// 町域の選択時に呼ばれるイベント
ADDRAjax.prototype.onChangeArea = function () {
    var vpref = this.getPrefValue();
    var vcity = this.getCityValue();
    var varea = this.getAreaValue();
    var __this = this;
    var areacb = function () {
        if ( __this.onceAfterArea ) {
            __this.onceAfterArea( vpref, vcity, varea );
            __this.onceAfterArea = null;
        } else if ( __this.onChange ) {
            __this.onChange( vpref, vcity, varea );
        }
    };
    window.setTimeout( areacb, 1 );
};

// 指定地域に移動する
ADDRAjax.prototype.setAddress = function (pref,city,area) {
    if ( pref ) {
        var __this = this;
        if ( city ) {
            this.onceAfterPref = function () {
                __this.setSelectValue( __this.elem_city, city );
                __this.onChangeCity();
            };
            if ( area ) {
                this.onceAfterCity = function () {
                    __this.setSelectValue( __this.elem_area, area );
                    __this.onChangeArea();
                };
            }
        }
        var func = function () {
            __this.setSelectValue( __this.elem_pref, pref );
            __this.onChangePref();
        };
        window.setTimeout( func, 1 );
    }
};
