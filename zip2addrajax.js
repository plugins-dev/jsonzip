//郵便番号変換しドリルダウン(ADDRAjax)に適用する	
if (!AjaxZip2.zip2addrajax) AjaxZip2.zip2addrajax =  function zip2addrajax(zip1, zip2, dd) {
	if (! zip1 ) return;
	if (! zip2 ) return;	
	var zip = zip1+ zip2;	
	if(!/^[0-9]+$/.test(zip)) return;	//入力値が半角英数かチェック
	if((zip).length < 7) return ; 	//入力値が七桁になるまで処理しない
	if((zip).length > 7) return ;		//入力値が七桁超えても処理しない
		
	jQuery.getJSON(AjaxZip2.JSONDATA +'/zip-'+zip1+'.json',function(data){
		var addArray = data[zip1+zip2];
		if(!addArray) return ;
		addArray[0] = AjaxZip2.PREFMAP[addArray[0]]; //県ID→県名変換
		
		//ADDRAjaxに都道府県名・市区町村名・町域名を渡す
		dd.setAddress(addArray[0], addArray[1], addArray[2]);
	});
}