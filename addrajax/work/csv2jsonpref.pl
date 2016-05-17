#!/usr/bin/perl
# ---------------------------------------------------------------- #
#   ADdress DRilled down by AJAX（Ajaxによる住所ドリルダウン検索）用
#   郵便番号一覧 CSV ファイルを JSON 形式に変換するスクリプト
#   http://www.kawa.net/works/ajax/addrajax/addrajax.html
#   (c) 2001-2007 Kawasaki Yusuke. All rights reserved.
# ---------------------------------------------------------------- #
    use strict;
    use utf8;
    use Encode;                     # 文字コード変換モジュール弾
    use lib qw( lib );
    use JSON;                       # JSON 2.0 以降がデフォルトです
#   use JSON::Syck;                 # JSON::Syckがあれば利用可能です
# ---------------------------------------------------------------- #
    my $VERSION  = '2.11';
    my $CSV_ENC  = 'CP932';         # CSVファイルのエンコーディング
    my $JSON_ENC = 'utf8';          # JSONファイルのエンコーディング
    my $DISP_ENC = 'utf8';          # 表示用のエンコーディング
    my $CSV_FILE = 'ken_all.csv';   # 入力元CSVファイル名（デフォルト）
    my $JSON_BASE = '../data/pref-%02d.json';   # 出力先JSONファイル名
# ---------------------------------------------------------------- #
    # local $| = 1;
    &main( @ARGV );
# ---------------------------------------------------------------- #
sub main {
    my $csvfile = shift || $CSV_FILE;

    # CSV ファイル全体を読み込む
    my $prev;
    my $c;
    my $hpref = {};
    my $hcity = {};
    my $harea = {};

    print STDERR "ken_all:\t$csvfile\n";
    open( CSV, $csvfile ) or die "$! - $csvfile\n";
    while ( my $iline = <CSV> ) {
        last if ( $iline =~ /^\x1a/ );  # EOF

        # UTF-8コードで処理する
        $iline = Encode::decode( $CSV_ENC, $iline );

        # CSVとはいっても「,」の文字は住所には利用されていないので簡易処理
        my @r = split( ",", $iline );
        s/^"(.*)"$/$1/s foreach ( @r );

        #『西新宿新宿アイランドタワー（１階）』等は削除してしまう
        if ( $r[8] =~ /（(０|１|２|３|４|５|６|７|８|９|地)+階/xs ) {
            $r[8] = "";
            $r[5] = "";
        }

        # 全角かっこ『（』以降を削除する
        if ( $r[8] =~ s/（.+$//s ) {
            $r[5] =~ s/\([^\(]+$//s;
        }
        
        # 岩手県    和賀郡西和賀町  杉名畑４４地割
        # 岩手県    和賀郡西和賀町  穴明２２地割、穴明２３地割
        # 岩手県    九戸郡洋野町    種市第１５地割～第２１地割
        $r[8] =~ s/(第)?(０|１|２|３|４|５|６|７|８|９)+地割.*$//s;

        #『以下に掲載がない場合』等は削除してしまう
        if ( $r[8] =~ /(^以下に掲載がない場合
                        |の次に番地がくる場合
                        |一円
                        |）
                        |、.*
                        )$/xs ) {
            $r[8] = "";
            $r[5] = "";
        }

        # 都道府県ID・市町村名・町域名のみ記録
        my $pref = int($r[0]/1000);
        my $cityid = $r[0]-0;
        $hpref->{$pref} ||= $r[6];  # 都道府県名用
        $hcity->{$pref} ||= {};     # 市町村名・町域名用
        $harea->{$cityid} ||= {};   # 重複チェック用
        $hcity->{$pref}->{$cityid} ||= [ $cityid, $r[7], [] ];
        if ( $r[8] && ! $harea->{$cityid}->{$r[8]} ++ ) {
            push( @{$hcity->{$pref}->{$cityid}->[2]}, $r[8] );
        }

        # 都道府県が変わったら、画面に都道府県名を表示する
        if ( $prev ne $pref ) {
            $prev = $pref;
            print STDERR " $c lines\n" if $c;
            my $v = sprintf( "%s  \t", $r[6] );
            $v = Encode::encode( $DISP_ENC, $v );
            print STDERR $v;
            $c = 0;
        }
        print STDERR "." if ( $c ++ % 200 == 0 );
    }
    print STDERR " $c lines\n" if ( $c > 0 );

    my $use_syck = $JSON::Syck::VERSION;
    my $use_json = $JSON::VERSION unless $use_syck;
    my $new_json = (( $use_json =~ /^([\d\.]+)/ )[0] >= 2.0 ) if $use_json;
    print STDERR "module: \tJSON.pm ($use_json)\n" if $use_json;
    print STDERR "module: \tJSON::Syck ($use_syck)\n" if $use_syck;

    # 都道府県ごとにJSONファイルに書き出していく

    foreach my $pref ( sort {$a<=>$b} keys %$hpref ) {
        # JSONフォーマットでダンプする
        my $pname = $hpref->{$pref};
        my $cities = $hcity->{$pref};
        my $list = [ map { $cities->{$_} } sort {$a<=>$b} keys %$cities ];
        my $data = [ $pref, $pname, $list ];
        my $dump = $use_syck ? JSON::Syck::Dump($data) : 
                   $new_json ? to_json($data) : objToJson($data);

        # JSONファイル名の決定
        my $jsonfile = sprintf( $JSON_BASE, $pref );

        # JSONファイル設置ディレクトリの確認
        my $jsondir = ( $jsonfile =~ m#^(.*/)[^/]+$# )[0];
        die "$! - $jsondir\n" if ( $jsondir && ! -d $jsondir );

        # 画面にファイル名を表示
        my $v = sprintf( "%s  \t%s %7dbytes\n", $pname, $jsonfile, length($dump) );
        $v = Encode::encode( $DISP_ENC, $v );
        print STDERR $v;

        # JSONファイルに書き出す
        open( JSON, "> $jsonfile" ) or die "$! - $jsonfile\n";
        $dump = Encode::encode( $JSON_ENC, $dump ) if $new_json;
        print JSON $dump, "\n";
        close( JSON );
    }
}
# ---------------------------------------------------------------- #
