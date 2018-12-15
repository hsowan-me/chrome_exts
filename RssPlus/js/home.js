var db = openDatabase('myrssdb', '1.0', 'I can rss everthing !', 2 * 1024 * 1024);
var index = 0 ;
var nums = 20 ;

var itemsval = [];
var vm = new Vue({
    el: '#app',
    data: {
      message: 'Hello Vue.js!',
      items: itemsval
    },
    computed: {
        site: {
          // getter
          get: function () {
            return this.message + ' ' + this.items
          },
          // setter
          set: function (newValue) {
              this.message = 'Hello Vue.js!';
              this.items = newValue
          }
        }
    }
});

function getIMGfromString(string){
    if(!string){//debug:null.match()报错 2018.12.11
        return null;
    }
    var imgReg = /<img.*?(?:>|\/>)/gi;
    var srcReg = /src=[\'\"]?([^\'\"]*)[\'\"]?/i;
    var arr = string.match(imgReg);  // arr 为包含所有img标签的数组
    if(!arr){
        return null;
    }
    var list =[]
    for (var i = 0; i < arr.length; i++){
        var src = arr[i].match(srcReg);
        //获取图片地址
        // console.log('图片地址'+(i+1)+'：'+src[1]);
        list.push(src[1]);
    }
    return list
}

var nowstamp = Date.parse(new Date())/1000;//单位秒

//将时间显示优化
function beautimey(ptmstamp){
    var xt = (nowstamp - ptmstamp)/60 ;//相差分钟数
    if(xt < 60)
        return xt + "分钟前"
    else if(xt/60 < 24)
        return Math.round(xt/60) + "小时前"
    else if(xt/60/24 < 2)
        return "昨天"
    else if(xt/60/24 < 3)
        return "前天"
    else if(xt/60/24 < 7){
        return Math.round(xt/60/24) + "天前";
    }
    else{
        var myDate = new Date(ptmstamp*1000);
        if (myDate.getFullYear() != new Date().getFullYear() )
            return myDate.getFullYear() + "年" + (myDate.getMonth()+1) + "月" + myDate.getDate() + "日";
        return (myDate.getMonth()+1) + "月" + myDate.getDate() + "日";
    }
}

function loadItemsfromWebsqlforhome(index, nums) {
    var sqlstr = `SELECT 
                    Rss.ico,
                    Rss.link,
                    Rss.rss,
                    Rss.title as rsstitle,
                    Feeds.title,
                    Feeds.description,
                    Feeds.url,
                    Feeds.pubtimestamp
                FROM Feeds 
                LEFT JOIN Rss ON Feeds.rssUrl = Rss.rss
                where isread ISNULL
                ORDER BY Feeds.pubtimestamp DESC 
                LIMIT ?,? `;
    db.transaction(function (tx) {
        tx.executeSql(sqlstr, [index, nums], function (tx, results) {
                var len = results.rows.length;
                //console.log(len); 

                if (len) {
                    for (i = 0; i < len; i++) {
                        var itemval = {};
                        itemval.rssico = results.rows.item(i).ico;
                        if (itemval.rssico == null || itemval.rssico == "") {
                            itemval.rssico = "./../images/icon.png";
                        }
                        itemval.rsstitle = results.rows.item(i).rsstitle;
                        itemval.rsslink = results.rows.item(i).link;
                        itemval.rssfeed = results.rows.item(i).rss;
                        itemval.itemurl = results.rows.item(i).url;
                        itemval.title = results.rows.item(i).title;
                        desc = results.rows.item(i).description;
                        imglist=getIMGfromString(desc);
                        itemval.descimg = imglist?imglist[0]:"";//若存在则提取第一张jpg
                        itemval.desc = desc?desc.replace(/<.*?>/g, ""):"点击查看详情";//删除所有标签
                        ptmstamp = results.rows.item(i).pubtimestamp;
                        itemval.timestr = beautimey(ptmstamp);//new Date(ptmstamp*1000).toLocaleString();
                        itemsval.push(itemval);
                    }              
                    //console.log(itemsval);
                    vm.site = itemsval;
                }
            },
            function (tx, error) {
                console.log('失败!', error.message)
            });
    });
}

//此处是滚动条到底部时候触发的事件，在这里写要加载的数据，或者是拉动滚动条的操作
//BUG：滚三次没效果了?各种奇怪问题。//DEBUG:==改为>=,MD滚远了
$(window).scroll(function () {
    var scrollTop = $(this).scrollTop();
    var scrollHeight = $(document).height();
    var windowHeight = $(this).height();
    // console.log(scrollTop,windowHeight,scrollHeight);
    if (scrollTop + windowHeight >= scrollHeight - 10) {
        index += nums;
        // console.log(index,nums);
        loadItemsfromWebsqlforhome(index,nums);
        setTimeout("initial_position()",100);
    }
});

//----------------
var unit_wid = 400;//单元格子宽度
var unit_edge = 30;//单元格子间隔
var unit_rate = 0.90;


$(document).ready(function(){
    loadItemsfromWebsqlforhome(index,nums);
    setTimeout("initial_position()",100);
});

function initial_position(){
    var wd = $(window).width();
    var wf_wid = wd*unit_rate;//可用于计算页面总宽度
    var num = Math.floor(wf_wid / unit_wid);//每行格子个数
    var wf_edge = (wd - (unit_wid * num + unit_edge * (num - 1))) / 2;//两侧剩余宽度
    var heightList = [];
    for (var i = 0;i< num ;i++) {
        heightList[i] = 0;
    }
    for (var j = 0;j < $('#wf .unit').length;j++) {
        var col_minHeight = getMin(heightList).min;
        var col_minIndex = getMin(heightList).index;//找出最小高度的格子行及其高度
        var new_top = col_minHeight;
        var new_left = col_minIndex * (unit_wid + unit_edge) + wf_edge ;//计算左边距
        var unit = $('#wf .unit');
        unit.eq(j).stop().animate({'top': new_top + 'px','left': new_left + 'px'},1000);
        heightList[col_minIndex] = col_minHeight + unit.eq(j).height() + unit_edge;
    }
    set_wfHeight(getMax(heightList));
}

$(window).resize(function(){
    initial_position();
});

function set_wfHeight (max) {
    var wf_height = max + 50;
    $('#wf').css('height',wf_height + 'px');
}

function getMax (arr) {
    var max = arr[0];
    for (var i=1;i<arr.length;i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

function getMin(arr){
    var min = arr[0];
    var index = 0;
    for(var i=1;i<arr.length;i++){
        if (arr[i] < min) {
            min = arr[i];
            index = i;
        }
    }
    return {min:min,index:index};
}

