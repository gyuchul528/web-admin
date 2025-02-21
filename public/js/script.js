$(document).ready(function() {
    $('input[name="submit"]').click(function(event) {
        var $name = $('input[name="username"]');
        var $password = $('input[name="password"]');
        var $verify = $('input[name="verify"]');
        var _name = $.trim( $name.val() );
        var _password = $.trim( $password.val() );
        var _verify = $.trim( $verify.val() );
        var _verify = $verify.val();

        if( _name == "" ) {
            alert("管理人IDを入力してください");
            $name.focus();
            return false;
        }
        if( _password == "" ) {
            alert("パスワードを入力してください");
            $password.focus();
            return false;
        }
        if( _verify == "" ) {
            alert("認証コードを入力してください");
            $verify.focus();
            return false;
        }
        if( _password!= _verify ) {
            alert("パスワードと認証コードが一致しません");
            $verify.focus();
            return false;
        }
    });

    // 默认展开第一个菜单
    $('.menu-section:first .menu-header').addClass('active');
    $('.menu-section:first .menu-content').show();

    // 点击菜单头部时的处理
    $('.menu-header').click(function() {
        // 获取当前点击的菜单内容
        var $content = $(this).next('.menu-content');
        var $icon = $(this).find('.toggle-icon');
        
        // 如果当前菜单是关闭的，则打开它并关闭其他菜单
        if (!$(this).hasClass('active')) {
            // 关闭其他所有菜单
            $('.menu-header').removeClass('active');
            $('.menu-content').slideUp(300);
            $('.toggle-icon').html('▼');
            
            // 打开当前菜单
            $(this).addClass('active');
            $content.slideDown(300);
            $icon.html('▲');
        } else {
            // 如果当前菜单是打开的，则关闭它
            $(this).removeClass('active');
            $content.slideUp(300);
            $icon.html('▼');
        }
    });
});