你是一个熟悉 JSON Schema 语法规范的软件工程师，需要你对 type 是 string 的字段，添加 `x-format` 扩展功能。

`x-format` 是搭建系统的拓展字段，可检查 string 类型字段值的格式。提供了以下类型名称来约束格式：

`@url`
校验填入的 URL 是否符合规范，语法规则为：`@url()`，检查是否为正常 URL 地址。

`@image`
校验填入的 URL 是否为图片。
语法规则为：`@image('WidthxHeight', format, minSize, maxSize)`。
参数说明：
- WidthxHeight：图片宽高尺寸，例如 '750x100'，'750x'(只限宽), 'x100'(只限高)。
- format：图片格式。
- minSize：图片文件最小值，单位KB，默认 0。
- maxSize：图片文件最大值，单位 KB。

示例：
```json
{
    "type": "string",
    "x-format": "@image('90x45')" //图片url所对应的图片像素为宽90像素，高45像素则成功，否则失败
}
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-45.gif" 
// fail=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-250-100.gif" 

{
    "type": "string",
    "x-format": "@image('90x')" //图片url所对应的图片像素为宽90像素则成功，否则失败
}
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-45.gif" 
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-250.gif" 
// fail=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-250-45.gif" 

{
    "type": "string",
    "x-format": "@image('x45')" //图片url所对应的图片像素高为45像素则成功，否则失败
}
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-45.gif" 
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-45-45.gif" 
// fail=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-45-90.gif" 

{
    "type": "string",
    "x-format": "@image()" //图片url所对应的是图片则成功，否则失败
}
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-45.gif" 
// fail=> "http://www.tmall.com"

{
    "type": "string",
    "x-format": "@image('90x45','jpg|gif',20,50.5)" //图片url所对应的图片像素为宽90像素，高45像素则成功，且图片格式是jpg或者png，文件大小在20kb~50.5kb之间，否则失败
}
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-45.gif" 
// fail=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-250-100.gif" 
// fail=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-45.png" 


{
    "type": "string",
    "x-format": "@image('90x45',,20,50.5)" //图片url所对应的图片像素为宽90像素，高45像素则成功，且文件大小在20kb~50.5kb之间，否则失败
}
// success=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-90-45.gif" 
// fail=> "http://img04.taobaocdn.com/tps/i4/T1ituPXwxXXXXF9njq-250-100.gif"
```

`@color`
校验填入内容是否为标准颜色格式。
语法规则：`@color()`、`@color('hex')`、`@color('rgb')`、`@color('rgba')`。
参数说明：无参数，默认支持 HEX 格式，例如 #FAFAFA；rgb：rgb 颜色模式；rgba：rgba 颜色模式。

示例：
```json
{
    "type": "string",
    "x-format": "@color()" 
}
{
    "type": "string",
    "x-format": "@color('hex')" 
}
// success=> "#00ff00" 
// success=> "#00FF00" 
// success=> "#0F0"
// success=> "#0f0"  
// fail=> "red"
// fail=> "00ff00"

{
    "type": "string",
    "x-format": "@color('rbg')" 
}

// success => "rgb(255,255,255)"
// fail => "#fffff"
// fail => "rgba(1,2,3,0.1)"


{
    "type": "string",
    "x-format": "@color('rbga')" 
}

// success => "rgba(255,255,255,0.8)"
// fail => "#fffff"
// fail => "rgb(255,255,255)"
```

根据上述教程，请完善以下 JSON Schema：
{codeStr}
