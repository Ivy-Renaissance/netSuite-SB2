/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(["N/currentRecord", "N/url", "N/https", "N/search", "N/record",],

    function (currentRecord, url, https, search, record,) {
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */

        function pageInit(scriptContext) {
            // hideOverlay();
        }

        //作废
        function declarationVoid(recordId){
            // showMask();
            //调用SL获取导出参数
            var urlLinkA = url.resolveScript({
                scriptId: `customscript_swc_sl_declarationexport`,
                deploymentId: `customdeploy_swc_sl_declarationexport`
            });
            var linkA = https.post({
                url: urlLinkA,
                body: JSON.stringify({
                    recordId: recordId,
                    type: "1" //作废
                }),
            })
            let parse = JSON.parse(linkA.body);

            if (parse.code == 500) {
                // hideOverlay();
                alert("操作失败！")
            } else {
                // hideOverlay();
                alert("操作成功！")
                window.onbeforeunload = null;
                window.location.reload();
            }

        }

        //导出
        function declarationExportExcel(recordId) {
            var curRecord = currentRecord.get();

            //调用SL获取导出参数
            var urlLinkA = url.resolveScript({
                scriptId: `customscript_swc_sl_declarationexport`,
                deploymentId: `customdeploy_swc_sl_declarationexport`
            });

            var linkA = https.post({
                url: urlLinkA,
                body: JSON.stringify({
                    recordId: recordId,
                    type: "2"//导出
                }),
            })
            let parse = JSON.parse(linkA.body);
            if (parse.code == 500) {
                alert("导出失败")
            } else {
                let declarationData = parse.declarationData;//报关单
                console.log("declarationData", parse.declarationData)

                if (declarationData.length == 0) {
                    alert("无数据导出")
                } else {
                    console.log("打印SL返回结果", JSON.parse(linkA.body))


                    //获取xml文本信息
                    var xmlStr = `
                    <?xml version="1.0"?>
                <?mso-application progid="Excel.Sheet"?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                 xmlns:o="urn:schemas-microsoft-com:office:office"
                 xmlns:x="urn:schemas-microsoft-com:office:excel"
                 xmlns:dt="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882"
                 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
                 xmlns:html="http://www.w3.org/TR/REC-html40">
                 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
                  <Author>Administrator</Author>
                  <LastAuthor>fengyu shen</LastAuthor>
                  <Created>2026-02-02T07:01:42Z</Created>
                  <LastSaved>2026-02-04T01:37:59Z</LastSaved>
                  <Version>14.00</Version>
                 </DocumentProperties>
                 <CustomDocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
                  <ICV dt:dt="string">1851B45A5AC04C8B98A62875529BC373_12</ICV>
                  <KSOProductBuildVer dt:dt="string">2052-12.1.0.24655</KSOProductBuildVer>
                  <CalculationRule dt:dt="float">0.0</CalculationRule>
                 </CustomDocumentProperties>
                 <OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">
                  <AllowPNG/>
                 </OfficeDocumentSettings>
                 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
                  <WindowHeight>9060</WindowHeight>
                  <WindowWidth>23040</WindowWidth>
                  <WindowTopX>-32760</WindowTopX>
                  <WindowTopY>-32760</WindowTopY>
                  <ProtectStructure>False</ProtectStructure>
                  <ProtectWindows>False</ProtectWindows>
                  <DisplayInkNotes>False</DisplayInkNotes>
                 </ExcelWorkbook>
                 <Styles>
                  <Style ss:ID="Default" ss:Name="Normal">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11" ss:Color="#000000"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s41" ss:Name="常规 2">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s42" ss:Name="超链接">
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11" ss:Color="#0000FF"
                    ss:Underline="Single"/>
                  </Style>
                  <Style ss:ID="m423009688" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="@"/>
                  </Style>
                  <Style ss:ID="m423009708" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009728" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009748" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009344" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009364" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009404" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009424" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009464" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009484" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009524" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009120" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009140" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009160" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009180" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009200" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009240" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009260" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009280" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009300" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008896" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008916" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008956" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008976" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009016" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009056" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423009076" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008672" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008692" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008732" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008752" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008792" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008812" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008832" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008852" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008448" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008468" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008488" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008528" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008548" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008568" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008224" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008264" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423008020" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423007552" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423007572" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423007592" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423007612" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Top" ss:ShrinkToFit="1"
                    ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423007712" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m423007732" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211419584" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="24" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211419604" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211419664" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Short Date"/>
                  </Style>
                  <Style ss:ID="m211419480" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211419500" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211420256" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211420376" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211420396" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Top" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="m211422944">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="24" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422964">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422984">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423004">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423024">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423044">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423084">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423104">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423124">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422720">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Short Date"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422740">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422760">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422780">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422800">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422496">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422516">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422536">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422556">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422576">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422596">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422616">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422272">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422292">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422312">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422332">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422352">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422372">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422048">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422068">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422088">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422108">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422128">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211422148">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421824">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421844">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421864">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421884">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421904">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421924">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421600">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421620">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421640">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421660">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421680">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421700">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421376">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421396">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421416">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421436">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421456">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421476">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421152">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421172">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421212">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421232">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421272">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="#,##0.00_);[Red]\\(#,##0.00\\)"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421292">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421312">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421332">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211420928">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211420948">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211420988">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421008">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421028">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421048">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211421108">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="[$HKD]\\ #,##0.00"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423904">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423924">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423944">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423984">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211424004">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211424024">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211424044">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211424064">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211424084">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat ss:Format="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;;@"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423680">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423700">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423740">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423760">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="8"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423780">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="8"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423800">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423820">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat ss:Format="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;;@"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423840">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="m211423860">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s65">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s66">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s67">
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                  </Style>
                  <Style ss:ID="s68">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s69">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s70">
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                  </Style>
                  <Style ss:ID="s71">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="14" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s72">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s73">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s74">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s75">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s76">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s77">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s78">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s79">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s80">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s81">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s82">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s83">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s84">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s85">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s86">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s87">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s88">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s89">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s90">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s91">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="9"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s92">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s93">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s94">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s95">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s96">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat ss:Format="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;;@"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s97">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat ss:Format="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;;@"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s98">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s99">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s100">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s101">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s102">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s103">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Top"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s104">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s105">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s106">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s107">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                  </Style>
                  <Style ss:ID="s108">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s109">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s110">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s111">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s112">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s113">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s114">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s115">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s116">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s117">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s118">
                   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s119">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s120">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s121">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s122">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s123">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s124">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s125">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="0.0000_);[Red]\\(0.0000\\)"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s126">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s127">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s128">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Standard"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s129">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s130">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s131">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s132">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s133">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="#,##0.00_);[Red]\\(#,##0.00\\)"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s134">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="[DBNum2][$-804]\\ General&quot;元整&quot;"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s135">
                   <Alignment ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s136">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="9"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s137">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s138">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s139" ss:Parent="s41">
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s140" ss:Parent="s41">
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s141" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s142" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s143" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s144" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s145" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s146" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s147" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s148" ss:Parent="s41">
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s149" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s150" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s151" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s152" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s153" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s154" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s155" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s156" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s157" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s158" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="22"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s159" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s160" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="Short Date"/>
                  </Style>
                  <Style ss:ID="s161" ss:Parent="s41">
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="20"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s162" ss:Parent="s41">
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="16"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s163" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s164" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s165" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s166" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s167" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s168" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom" ss:WrapText="1"/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s169" ss:Parent="s41">
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Color="#FF0000"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s170" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s171" ss:Parent="s41">
                   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s172" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Top"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s173" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s174" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Top"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s175" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s176" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s177" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s178" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s179" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s180" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s181" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s182" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s183" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <Protection ss:Protected="0"/>
                  </Style>
                  <Style ss:ID="s184" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <Protection ss:Protected="0"/>
                  </Style>
                  <Style ss:ID="s185" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s186" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s187" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s188" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s189" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s190" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s191" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <Protection ss:Protected="0"/>
                  </Style>
                  <Style ss:ID="s192" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <Protection ss:Protected="0"/>
                  </Style>
                  <Style ss:ID="s193" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s194" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s195" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="24"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s196" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="24"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s197" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s198" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s199" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s200" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat ss:Format="0.0000_);[Red]\\(0.0000\\)"/>
                  </Style>
                  <Style ss:ID="s201" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="0.000_);[Red]\\(0.000\\)"/>
                  </Style>
                  <Style ss:ID="s202" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat ss:Format="0.0000_);[Red]\\(0.0000\\)"/>
                  </Style>
                  <Style ss:ID="s203" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s204" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="0.000_);[Red]\\(0.000\\)"/>
                  </Style>
                  <Style ss:ID="s205" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="#,##0.00_);[Red]\\(#,##0.00\\)"/>
                  </Style>
                  <Style ss:ID="s206" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s207" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s208" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s209" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s211" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s212" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s213" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s214" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s215" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s216" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s217" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s218" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s219" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s220" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s221" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s222" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s223" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s224" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s225" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s226" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s227" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s228" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s229" ss:Parent="s41">
                   <Alignment ss:Vertical="Bottom"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s230" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s231" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s232" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s233" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s234" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s235" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s236" ss:Parent="s42">
                   <Alignment ss:Vertical="Center"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11" ss:Underline="Single"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s237" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s238" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s239" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s240" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s241" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s242" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s243" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s244" ss:Parent="s41">
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s245" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s246" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s247" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s248" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s249" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s250" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s251" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s252">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s253">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s254">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s255">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s256">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s257">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s258">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s259">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="[DBNum2][$-804]\\ General&quot;元整&quot;"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s260">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s261">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s262">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s263">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"
                    ss:Underline="Single"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s264">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s265">
                   <Alignment ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/>
                   </Borders>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s444" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s449" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s450" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s454" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s455" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="#,##0.0000_ "/>
                  </Style>
                  <Style ss:ID="s461" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s464" ss:Parent="s41">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s470" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s478" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s481" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s482" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s484" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s485" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                
                  </Style>
                  <Style ss:ID="s488" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s489" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s490" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s496" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="14" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                
                  <Style ss:ID="s498" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Interior/>
                  </Style>
                  
                  
                  <Style ss:ID="s499" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s501" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s506" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s508" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:Bold="1"/>
                   <Interior/>
                   <NumberFormat ss:Format="[DBNum2][$-804]\\ General&quot;元整&quot;"/>
                  </Style>
                  <Style ss:ID="s512" ss:Parent="s41">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s521" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="22" ss:Bold="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s522" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12" ss:StrikeThrough="1"/>
                   <Interior/>
                  </Style>
                  <Style ss:ID="s526">
                   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="11"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s529">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;;@"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s545">
                   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s548">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="Times New Roman" x:Family="Roman" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s578">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s590">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134"/>
                   <Interior/>
                   <NumberFormat ss:Format="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;;@"/>
                   <Protection/>
                  </Style>
                  <Style ss:ID="s614">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                   <Borders/>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                   <NumberFormat ss:Format="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;;@"/>
                   <Protection/>
                  </Style>
                  
                  
                  
                  
                  <Style ss:ID="s213a" ss:Parent="s41">
                       <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                       <Borders>
                        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                         ss:Color="#000000"/>
                       </Borders>
                       <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                       <Interior/>
                  </Style>
                  <Style ss:ID="s214a" ss:Parent="s41">
                       <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                       <Borders>
                        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                         ss:Color="#000000"/>
                        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                         ss:Color="#000000"/>
                       </Borders>
                       <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                       <Interior/>
                 </Style>
                 <Style ss:ID="s108a" ss:Parent="s41">
                   <Alignment ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                 </Style>
                 <Style ss:ID="s220a" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                 </Style>
                 <Style ss:ID="s221a" ss:Parent="s41">
                   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ShrinkToFit="1"/>
                   <Borders>
                    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"
                     ss:Color="#000000"/>
                   </Borders>
                   <Font ss:FontName="宋体" x:CharSet="134" ss:Size="12"/>
                   <Interior/>
                 </Style>
                 
                 </Styles>
 
                    
                    
                    
                     `

                    xmlStr += sheet1(declarationData);
                    xmlStr += sheet2(declarationData);
                    xmlStr += sheet3(declarationData);
                    xmlStr += sheet4(declarationData);
                    xmlStr += sheet5(declarationData);


                    var uri = `data:application/vnd.ms-excel;base64,`;
                    var a = document.createElement("a");                                                              // 为了给xls文件命名，重新创建一个a元素
                    a.href = uri + base64(xmlStr);                                                                           // 给a元素设置 href属性
                    a.download = "报关单Excel" + `.xls`;                                                                       // 设置下载Excel文件名
                    a.click();
                }
            }
        }


        function sheet1(declarationData) {
            var xmlStr = '';
            console.log("返回数据", declarationData)
            xmlStr += `	 
                                            
                        <Worksheet ss:Name="报关单">
                          <Table ss:ExpandedColumnCount="9999" ss:ExpandedRowCount="9999" x:FullColumns="1"
                           x:FullRows="1" ss:DefaultRowHeight="14.55">
                           <Row ss:AutoFitHeight="0" ss:Height="16.2">
                            <Cell ss:MergeAcross="18" ss:StyleID="s488"><Data ss:Type="String">${declarationData[0].bgdTitle}</Data></Cell>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s211"><Data ss:Type="String">签约地点：</Data></Cell>
                            <Cell ss:StyleID="s212"><Data ss:Type="String">${declarationData[0].ljka}</Data></Cell>
                            <Cell ss:StyleID="s212"/>
                            <Cell ss:StyleID="s212"/>
                            <Cell ss:StyleID="s212"/>
                            <Cell ss:StyleID="s212"/>
                            <Cell ss:StyleID="s213"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="16.2">
                            <Cell ss:MergeAcross="1" ss:StyleID="s214"><Data ss:Type="String">预录入编号：</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="s489"/>
                            <Cell ss:StyleID="s214"><Data ss:Type="String">申报口岸:</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="s489"/>
                            <Cell ss:StyleID="s214"><Data ss:Type="String">海关编号:</Data></Cell>
                            <Cell ss:MergeAcross="4" ss:StyleID="s489"/>
                            <Cell ss:StyleID="s215"/>
                            <Cell ss:StyleID="s215"/>
                            <Cell ss:StyleID="s215"/>
                            <Cell ss:StyleID="s215"/>
                            <Cell ss:StyleID="s215"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s216"><Data ss:Type="String">成交方式:</Data></Cell>
                            <Cell ss:StyleID="s144"><Data ss:Type="String">${declarationData[0].cjfs}</Data></Cell>
                            <Cell ss:StyleID="s212"><Data ss:Type="String">${declarationData[0].ljkaChar}</Data></Cell>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">付款条件：</Data></Cell>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">电汇</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s217"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="1" ss:StyleID="s490"><Data ss:Type="String">境内发货人</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423009688"/>
                            <Cell ss:StyleID="s218"><Data ss:Type="String">出境关别</Data></Cell>
                            <Cell ss:StyleID="s219"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s218"><Data ss:Type="String">出口日期</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423009708"/>
                            <Cell ss:StyleID="s218"><Data ss:Type="String">申报日期</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423009728"/>
                            <Cell ss:StyleID="s218"><Data ss:Type="String">备案号</Data></Cell>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009748"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s220"><Data ss:Type="String">卖方公司：</Data></Cell>
                            <Cell ss:StyleID="s221"><Data ss:Type="String">${declarationData[0].jnfhr}</Data></Cell>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s217"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009344"><Data ss:Type="String">${declarationData[0].jnfhr}</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423009364"/>
                            <Cell ss:MergeAcross="2" ss:StyleID="s478"/>
                            <Cell ss:StyleID="s222"/>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009404"/>
                            <Cell ss:MergeAcross="4" ss:StyleID="m423009424"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s220"><Data ss:Type="String">卖方地址：</Data></Cell>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s217"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="1" ss:StyleID="s481"><Data ss:Type="String">境外收货人</Data></Cell>
                            <Cell ss:StyleID="s223"><Data ss:Type="String">AEO：</Data></Cell>
                            <Cell ss:StyleID="s224"/>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">运输方式</Data></Cell>
                            <Cell ss:StyleID="s226"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009464"><Data ss:Type="String">运输工具名称及航次号</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">提运单号</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423009484"/>
                            <Cell ss:MergeAcross="1" ss:StyleID="s484"/>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423009524"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s216"><Data ss:Type="String">卖方电话：</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">卖方传真：</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s217"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009120"><Data ss:Type="String">${declarationData[0].jwshr}</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423009140"><Data ss:Type="String">${declarationData[0].ysfs}</Data></Cell>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009160"/>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009180"/>
                            <Cell ss:MergeAcross="4" ss:StyleID="m423009200"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s220"><Data ss:Type="String">买方公司：</Data></Cell>
                            <Cell ss:StyleID="s221"><Data ss:Type="String">${declarationData[0].jwshr}</Data></Cell>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s217"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="1" ss:StyleID="s481"><Data ss:Type="String">生产销售单位</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423009240"><Data ss:Type="Number">0</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">监管方式</Data></Cell>
                            <Cell ss:StyleID="s226"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">征免性质</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423009260"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">许可证号</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423009280"/>
                            <Cell ss:StyleID="s225"/>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009300"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s216"><Data ss:Type="String">买方地址：</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s217"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="3" ss:StyleID="m423008896"><Data ss:Type="String">${declarationData[0].scxsdw}</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008916"><Data ss:Type="String">${declarationData[0].jgfs}</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="s478"><Data ss:Type="String">${declarationData[0].zmxz}</Data></Cell>
                            <Cell ss:StyleID="s222"/>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423008956"/>
                            <Cell ss:MergeAcross="4" ss:StyleID="m423008976"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s220"><Data ss:Type="String">买方电话：</Data></Cell>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"><Data ss:Type="String">买方传真：</Data></Cell>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s221"/>
                            <Cell ss:StyleID="s217"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="16.2">
                            <Cell ss:MergeAcross="1" ss:StyleID="s485"><Data ss:Type="String">合同协议号</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423009016"><Data ss:Type="String"></Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">贸易国(地区)</Data></Cell>
                            <Cell ss:StyleID="s226"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">运抵国(地区)</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="s482"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">指运港</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423009056"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">离境口岸</Data></Cell>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423009076"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s227"><Data ss:Type="String">报关简称：</Data></Cell>
                            <Cell ss:StyleID="s228"/>
                            <Cell ss:StyleID="s228"/>
                            <Cell ss:StyleID="s228"><Data ss:Type="String">报关全称：</Data></Cell>
                            <Cell ss:StyleID="s228"/>
                            <Cell ss:StyleID="s228"/>
                            <Cell ss:StyleID="s229"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="3" ss:StyleID="m423008672"><Data ss:Type="String">${declarationData[0].htxyh}</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008692"><Data ss:Type="String">${declarationData[0].tradingCountry}</Data></Cell>
                            <Cell ss:MergeAcross="3" ss:StyleID="s478"><Data ss:Type="String">${declarationData[0].ydg}</Data></Cell>
                            <Cell ss:MergeAcross="3" ss:StyleID="m423008732"><Data ss:Type="String">${declarationData[0].zyg}</Data></Cell>
                            <Cell ss:MergeAcross="4" ss:StyleID="m423008752"><Data ss:Type="String">${declarationData[0].ljka}</Data></Cell>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">境外收货人：</Data></Cell>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">境外收货人通常指签订并执行出口贸易合同中的买方或合同指定的收货人，名称一般填报英文名称，检验检疫要求填报其他外文名称的，在英文名称后填报，以半角括号分隔。</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="1" ss:StyleID="s481"><Data ss:Type="String">包装种类</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008792"><Data ss:Type="String">(    )</Data></Cell>
                            <Cell ss:StyleID="s230"><Data ss:Type="String">件数</Data></Cell>
                            <Cell ss:StyleID="s231"><Data ss:Type="String">毛重（千克）</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008812"><Data ss:Type="String">净重（千克）</Data></Cell>
                            <Cell ss:StyleID="s232"><Data ss:Type="String">成交方式</Data></Cell>
                            <Cell ss:StyleID="s223"><Data ss:Type="String">(  )</Data></Cell>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">运费</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008832"/>
                            <Cell ss:StyleID="s223"><Data ss:Type="String">保费</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008852"/>
                            <Cell ss:StyleID="s225"><Data ss:Type="String">杂费</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008448"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">境外收货人代码：</Data></Cell>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">非互认国家（地区）AEO企业等其他情形，编码免于填报。对于AEO互认国家（地区）企业的，编码填报AEO编码，填报样式按照海关总署发布的相关公告要求填报（如新加坡AEO企业填报样式为：SG123456789012，韩国AEO企业填报样式为KR1234567，具体见相关公告要求）。</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:MergeAcross="3" ss:StyleID="m423008468"><Data ss:Type="String">纸箱</Data></Cell>
                            <Cell ss:StyleID="s233"><Data ss:Type="String">${declarationData[0].js}</Data></Cell>
                            <Cell ss:StyleID="s233"><Data ss:Type="String">${declarationData[0].grossWeight}</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="m423008488"><Data ss:Type="String">${declarationData[0].netWeight}</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="s234"><Data ss:Type="String">${declarationData[0].cjfs}</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423008528"/>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423008548"/>
                            <Cell ss:MergeAcross="2" ss:StyleID="m423008568"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">检验检疫附加编号：</Data></Cell>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">通过以下网站输入10位HS编号，再根据申报要素细分确定3位检疫附加编号</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:StyleID="s235"><Data ss:Type="String">随附单证及编号</Data></Cell>
                            <Cell ss:StyleID="s142"/>
                            <Cell ss:MergeAcross="16" ss:StyleID="m423008224"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">检疫局网址-编码查询：</Data></Cell>
                            <Cell ss:StyleID="s236" ss:HRef="https://e-service.shciq.gov.cn/shesp/"
                             x:HRefScreenTip="https://e-service.shciq.gov.cn/shesp/"><Data ss:Type="String">https:||e-service.shciq.gov.cn|shesp|</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s236"/>
                            <Cell ss:StyleID="s236"/>
                            <Cell ss:StyleID="s236"/>
                            <Cell ss:StyleID="s236"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="16.2">
<!--                            <Cell ss:MergeAcross="2" ss:StyleID="s464"><Data ss:Type="String">${declarationData[0].sfdzjbh}</Data></Cell>-->
                            <Cell ss:MergeAcross="2" ss:StyleID="s464"><Data ss:Type="String">境外收货人完整显示</Data></Cell>
                            <Cell ss:MergeAcross="15" ss:StyleID="m423008264"><Data ss:Type="String">${declarationData[0].jwshr}</Data></Cell>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">查申报要素网址：</Data></Cell>
                            <Cell ss:StyleID="s236" ss:HRef="http://www.hscode.net/IntegrateQueries/QueryYS/"><Data
                              ss:Type="String">http:||www.hscode.net|IntegrateQueries|QueryYS|</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s236"/>
                            <Cell ss:StyleID="s236"/>
                            <Cell ss:StyleID="s236"/>
                            <Cell ss:StyleID="s236"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:StyleID="s198"><Data ss:Type="String">标记唛码及备注：</Data></Cell>
                            <Cell ss:StyleID="s139"/>
                            <Cell ss:MergeAcross="16" ss:StyleID="s147"><Data ss:Type="String">${declarationData[0].bjmmjbz}</Data></Cell>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s140"><Data ss:Type="String">贸易国：出口是指合同买方所在的国家（地区），需填写准确，以后可能会影响收汇。</Data></Cell>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                            <Cell ss:StyleID="s140"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="16.2">
                            <Cell ss:StyleID="s198"><Data ss:Type="String">备注：</Data></Cell>
                            <Cell ss:MergeAcross="17" ss:StyleID="s159"><Data ss:Type="String">${declarationData[0].bz}</Data></Cell>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s41"/>
                            <Cell ss:StyleID="s41"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="16.2">
                            <Cell ss:MergeAcross="10" ss:StyleID="s470"/>
                            <Cell ss:MergeAcross="2" ss:StyleID="s149"><Data ss:Type="String">报关联系电话：</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="s143"/>
                            <Cell ss:StyleID="s139"/>
                            <Cell ss:StyleID="s139"/>
                            <Cell ss:StyleID="s237"><Data ss:Type="String">合计：</Data></Cell>
                            <Cell ss:StyleID="s237"/>
                            <Cell ss:StyleID="s238"/>
                            <Cell ss:StyleID="s239"/>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="16.2">
                            <Cell ss:StyleID="s240"><Data ss:Type="String">特殊关系确认:</Data></Cell>
                            <Cell ss:StyleID="s241"/>
                            <Cell ss:StyleID="s242"><Data ss:Type="String">${declarationData[0].tsgxqr}</Data></Cell>
                            <Cell ss:StyleID="s243"><Data ss:Type="String">价格影响确认：</Data></Cell>
                            <Cell ss:StyleID="s242"><Data ss:Type="String">${declarationData[0].jgyxqr}</Data></Cell>
                            <Cell ss:StyleID="s241"><Data ss:Type="String">支付特许权使用费:</Data></Cell>
                            <Cell ss:StyleID="s242"><Data ss:Type="String">${declarationData[0].jgyxqr}</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="s243"><Data ss:Type="String">自报自缴:</Data></Cell>
                            <Cell ss:StyleID="s244"><Data ss:Type="String">${declarationData[0].zbzj}</Data></Cell>
                            <Cell ss:MergeAcross="7" ss:StyleID="m423008020"><Data ss:Type="String">原产国|目的国|货源地未注明的项默认与提供的项相同</Data></Cell>
                            <Cell  ss:StyleID="m423008020"></Cell>
                            <Cell ss:StyleID="s245"><Data ss:Type="Number">${declarationData[0].totalAmount}</Data></Cell>
                            <Cell ss:StyleID="s245"><Data ss:Type="String">${declarationData[0].totalNetWeight}</Data></Cell>
                            <Cell ss:StyleID="s245"><Data ss:Type="Number">${declarationData[0].totalGrossWeight}</Data></Cell>
                            <Cell ss:StyleID="s245"><Data ss:Type="String">${declarationData[0].totalPieces}</Data></Cell>
                           </Row>
                           <Row ss:AutoFitHeight="0" ss:Height="15.45">
                            <Cell ss:StyleID="s246"><Data ss:Type="String">项号</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="s461"><Data ss:Type="String">商品编号</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="s461"><Data ss:Type="String">商品名称</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="s461"><Data ss:Type="String">数量及单位</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="s461"><Data ss:Type="String">单价|总价|币制</Data></Cell>
                            <Cell ss:MergeAcross="1" ss:StyleID="s461"><Data ss:Type="String">原产国（地区）</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="s461"><Data ss:Type="String">最终目的国（地区）</Data></Cell>
                            <Cell ss:MergeAcross="2" ss:StyleID="s461"><Data ss:Type="String">境内货源地</Data></Cell>
                            <Cell ss:StyleID="s247"><Data ss:Type="String">征免</Data></Cell>
                            <Cell ss:StyleID="s248"><Data ss:Type="String">金额</Data></Cell>
                            <Cell ss:StyleID="s248"><Data ss:Type="String">净重</Data></Cell>
                            <Cell ss:StyleID="s249"><Data ss:Type="String">毛重</Data></Cell>
                            <Cell ss:StyleID="s249"><Data ss:Type="String">件数</Data></Cell>
                           </Row>
            `;

            declarationData[0].lineData.forEach((item,index) => {
                // 第一行 - 根据实际XML结构
                xmlStr += `<Row ss:Height="15.45">\n`;
                xmlStr += `  <Cell ss:StyleID="s199"><Data ss:Type="Number">${item.lineNumber}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="1" ss:MergeDown="2" ss:StyleID="m423007592"><Data ss:Type="String">${item.hscode}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="2" ss:StyleID="s454"><Data ss:Type="String">${item.spmc}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:StyleID="s215"><Data ss:Type="String">${item.zjz}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:StyleID="s215"><Data ss:Type="String">${item.zldw}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="1" ss:StyleID="s455"><Data ss:Type="String">${item.dj}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="1" ss:StyleID="s454"><Data ss:Type="String">${item.ycg}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="2" ss:StyleID="s444"><Data ss:Type="String">${item.zzmdg}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="2" ss:StyleID="s454"><Data ss:Type="String">${item.jnhyd}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:StyleID="s250"/>\n`;
                xmlStr += `  <Cell ss:MergeDown="2" ss:StyleID="m423007712"><Data ss:Type="String">${item.amount}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeDown="2" ss:StyleID="m423007732"><Data ss:Type="String">${item.jz}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeDown="2" ss:StyleID="m423007552"><Data ss:Type="String">${item.mz}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeDown="2" ss:StyleID="m423007572"><Data ss:Type="String">${item.js}</Data></Cell>\n`;
                xmlStr += `</Row>\n`;

                // 第二行
                xmlStr += `<Row ss:Height="15.45">\n`;
                xmlStr += `  <Cell ss:StyleID="s199"/>\n`;
                xmlStr += `  <Cell ss:Index="4" ss:MergeAcross="2" ss:MergeDown="1" ss:StyleID="m423007612"><Data ss:Type="String">${item.ggxh}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:StyleID="s215"><Data ss:Type="String">${item.sl}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:StyleID="s215"><Data ss:Type="String">${item.sldw}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="1" ss:StyleID="s214"><Data ss:Type="String">${item.zj}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="1" ss:StyleID="s454"/>\n`;
                xmlStr += `  <Cell ss:MergeAcross="2" ss:StyleID="s454"/>\n`;
                xmlStr += `  <Cell ss:MergeAcross="2" ss:StyleID="s454"/>\n`;
                // xmlStr += `  <Cell ss:StyleID="s213a"/>\n`;
                // xmlStr += `  <Cell ss:StyleID="s213a"/>\n`;
                // xmlStr += `  <Cell ss:StyleID="s214a"/>\n`;
                // xmlStr += `  <Cell ss:StyleID="s214a"/>\n`;
                xmlStr += `  <Cell ss:StyleID="s250"/>\n`;
                xmlStr += `</Row>\n`;

                // 第三行
                xmlStr += `<Row ss:Height="15.45">\n`;
                xmlStr += `  <Cell ss:StyleID="s234"/>\n`;
                xmlStr += `  <Cell ss:Index="7" ss:StyleID="s251"/>\n`;
                xmlStr += `  <Cell ss:StyleID="s251"/>\n`;
                xmlStr += `  <Cell ss:MergeAcross="1" ss:StyleID="s449"><Data ss:Type="String">${item.bz}</Data></Cell>\n`;
                xmlStr += `  <Cell ss:MergeAcross="1" ss:StyleID="s450"/>\n`;
                xmlStr += `  <Cell ss:MergeAcross="2" ss:StyleID="s450"/>\n`;
                xmlStr += `  <Cell ss:MergeAcross="2" ss:StyleID="s450"/>\n`;

                // xmlStr += `<Cell ss:StyleID="s108a"/>\n`;
                // xmlStr += `<Cell ss:StyleID="s220a"/>\n`;
                // xmlStr += `<Cell ss:StyleID="s221a"/>\n`;
                // xmlStr += `<Cell ss:StyleID="s221a"/>\n`;

                xmlStr += `  <Cell ss:StyleID="s222"/>\n`;
                xmlStr += `</Row>\n`;
                console.log("for返回数据", item)


            });

            xmlStr += `  </Table>\n`;
            xmlStr += `  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n`;
            xmlStr += `   <PageSetup>\n`;
            xmlStr += `    <Header x:Margin="0.3"/>\n`;
            xmlStr += `    <Footer x:Margin="0.3"/>\n`;
            xmlStr += `    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n`;
            xmlStr += `   </PageSetup>\n`;
            xmlStr += `   <Unsynced/>\n`;
            xmlStr += `   <PageBreakZoom>60</PageBreakZoom>\n`;
            xmlStr += `   <Selected/>\n`;
            xmlStr += `   <Panes>\n`;
            xmlStr += `    <Pane>\n`;
            xmlStr += `     <Number>3</Number>\n`;
            xmlStr += `     <ActiveRow>15</ActiveRow>\n`;
            xmlStr += `     <ActiveCol>1</ActiveCol>\n`;
            xmlStr += `     <RangeSelection>R16C2:R16C19</RangeSelection>\n`;
            xmlStr += `    </Pane>\n`;
            xmlStr += `   </Panes>\n`;
            xmlStr += `   <ProtectObjects>False</ProtectObjects>\n`;
            xmlStr += `   <ProtectScenarios>False</ProtectScenarios>\n`;
            xmlStr += `  </WorksheetOptions>\n`;
            xmlStr += ` </Worksheet>\n`;


            return xmlStr;
        }


        function sheet2(declarationData) {
            var xmlStr = '';
            console.log("返回数据", declarationData)
            xmlStr += `	 
                     
                 <Worksheet ss:Name="发票">
                  <Table ss:ExpandedColumnCount="9999" ss:ExpandedRowCount="9999" x:FullColumns="1"
                   x:FullRows="1" ss:DefaultRowHeight="14.55">
                   <Row ss:AutoFitHeight="0" ss:Height="30.45">
                    <Cell ss:MergeAcross="7" ss:StyleID="m211419584"><Data ss:Type="String">發票&#10;INVOICE</Data></Cell>
                   </Row>
                   <Row ss:AutoFitHeight="0" ss:Height="30.45">
                    <Cell ss:StyleID="s195"/>
                    <Cell ss:StyleID="s196"/>
                    <Cell ss:StyleID="s196"/>
                    <Cell ss:StyleID="s196"/>
                    <Cell ss:StyleID="s196"/>
                    <Cell ss:StyleID="s197"><Data ss:Type="String">編   號&#10;NO:</Data></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="m211419604"><Data ss:Type="String">${declarationData[0].htxyh}</Data></Cell>
                   </Row>
                   <Row ss:AutoFitHeight="0" ss:Height="31.200000000000003">
                    <Cell ss:MergeAcross="1" ss:StyleID="s166"><Data ss:Type="String">商  號&#10;Sold to Massrs:</Data></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="s512"><Data ss:Type="String">${declarationData[0].jwshr}</Data></Cell>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:StyleID="s164"><Data ss:Type="String">日  期&#10;DATE:</Data></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="m211419664"><Data ss:Type="DateTime">${declarationData[0].yesterdayStr}</Data></Cell>
                   </Row>
                   <Row ss:AutoFitHeight="0" ss:Height="15.45">
                    <Cell ss:StyleID="s198"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:MergeAcross="1" ss:StyleID="s143"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:MergeAcross="2" ss:StyleID="s143"/>
                   </Row>
                   <Row ss:AutoFitHeight="0" ss:Height="15.45">
                    <Cell ss:StyleID="s198"/>
                    <Cell ss:MergeAcross="1" ss:StyleID="s143"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:StyleID="s170"/>
                   </Row>
                   <Row ss:AutoFitHeight="0" ss:Height="15.45">
                    <Cell ss:StyleID="s198"/>
                    <Cell ss:StyleID="s143"/>
                    <Cell ss:StyleID="s143"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:StyleID="s139"/>
                    <Cell ss:StyleID="s149"><Data ss:Type="String">成交方式：</Data></Cell>
                    <Cell ss:StyleID="s139"><Data ss:Type="String">${declarationData[0].cjfs}</Data></Cell>
                    <Cell ss:StyleID="s170"><Data ss:Type="String">${declarationData[0].ljkaChar}</Data></Cell>
                   </Row>
                   <Row ss:AutoFitHeight="0" ss:Height="62.550000000000004">
                    <Cell ss:MergeAcross="1" ss:StyleID="s501"><Data ss:Type="String">標記號碼&#10;Mark &amp; No</Data></Cell>
                    <Cell ss:StyleID="s177"><Data ss:Type="String">貨物名稱&#10;Description</Data></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="m211419480"><Data ss:Type="String">數量&#10;Quantity</Data></Cell>
                    <Cell ss:StyleID="s177"><Data ss:Type="String">單價&#10;Unit price</Data></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="m211419500"><Data ss:Type="String">總金額&#10;Amount</Data></Cell>
                   </Row>
                  <!--第一条数据-->
                  <Row ss:AutoFitHeight="0" ss:Height="27.45">;
                     <Cell ss:MergeAcross="1" ss:MergeDown="${declarationData[0].lineData.length-1}" ss:StyleID="s499"><Data ss:Type="String">&#10;N/M</Data></Cell>;
                     <Cell ss:StyleID="s199"><Data ss:Type="String">${declarationData[0].lineData[0].spmc}</Data></Cell>
                     <Cell ss:StyleID="s199"><Data ss:Type="String">${declarationData[0].lineData[0].sl}</Data></Cell>
                     <Cell ss:StyleID="s141"><Data ss:Type="String">${declarationData[0].lineData[0].script}</Data></Cell>
                     <Cell ss:StyleID="s200"><Data ss:Type="String">${declarationData[0].lineData[0].dj}</Data></Cell>
                     <Cell ss:StyleID="s201"><Data ss:Type="String">${declarationData[0].lineData[0].bz}</Data></Cell>
                     <Cell ss:StyleID="s202"><Data ss:Type="String">${declarationData[0].lineData[0].zj}</Data></Cell>
                  </Row>
       
               `;

            declarationData[0].lineData.forEach((item,index) => {
                // 排除第一条数据
                if(index >= 1) {
                    xmlStr += `<Row ss:AutoFitHeight="0" ss:Height="27.45">`;
                    xmlStr += `    <Cell ss:Index="3" ss:StyleID="s199"><Data ss:Type="String">${item.spmc}</Data></Cell>`;
                    xmlStr += `    <Cell ss:StyleID="s199"><Data ss:Type="String">${item.sl}</Data></Cell>`;
                    xmlStr += `    <Cell ss:StyleID="s141"><Data ss:Type="String">${item.script}</Data></Cell>`;
                    xmlStr += `    <Cell ss:StyleID="s200"><Data ss:Type="String">${item.dj}</Data></Cell>`;
                    xmlStr += `    <Cell ss:StyleID="s201"><Data ss:Type="String">${item.bz}</Data></Cell>`;
                    xmlStr += `    <Cell ss:StyleID="s202"><Data ss:Type="String">${item.zj}</Data></Cell>`;
                    xmlStr += `</Row>`;
                }
            });

            xmlStr += `
                  <Row ss:AutoFitHeight="0" ss:Height="27.45">
                        <Cell ss:MergeAcross="1" ss:StyleID="s506"><Data ss:Type="String"></Data></Cell>
                        <Cell ss:MergeAcross="2" ss:StyleID="s508"><Data ss:Type="String">${declarationData[0].totalAmountChinese}</Data></Cell>
                        <Cell ss:StyleID="s203"><Data ss:Type="String">TOTAL:</Data></Cell>
                         <!-- 总价合计-->
                        <Cell ss:StyleID="s204"><Data ss:Type="String">${declarationData[0].lineData[0].bz}</Data></Cell>
                        <Cell ss:StyleID="s205"><Data ss:Type="String">${declarationData[0].totalZj}</Data></Cell>
                       </Row>
                       <Row ss:AutoFitHeight="0" ss:Height="27.45">
                        <Cell ss:MergeAcross="1" ss:MergeDown="2" ss:StyleID="s496"><Data
                          ss:Type="String">唛头&#10;Marks</Data></Cell>
                        <Cell ss:MergeDown="1" ss:StyleID="s143"/>
                        <Cell ss:StyleID="s147"/>
                        <Cell ss:StyleID="s147"/>
                        <Cell ss:MergeAcross="2" ss:MergeDown="1" ss:StyleID="s498"><Data
                          ss:Type="String">备注：</Data></Cell>
                       </Row>
                       <Row ss:AutoFitHeight="0" ss:Height="27.45">
                        <Cell ss:Index="4" ss:StyleID="s147"/>
                        <Cell ss:StyleID="s147"/>
                       </Row>
                       <Row ss:AutoFitHeight="0" ss:Height="27.45">
                        <Cell ss:Index="3" ss:StyleID="s147"/>
                        <Cell ss:StyleID="s147"/>
                        <Cell ss:StyleID="s147"/>
                        <Cell ss:StyleID="s147"/>
                        <Cell ss:StyleID="s147"/>
                        <Cell ss:StyleID="s206"/>
                       </Row>
                       <Row ss:AutoFitHeight="0" ss:Height="16.2">
                        <Cell ss:StyleID="s207"/>
                        <Cell ss:StyleID="s208"/>
                        <Cell ss:StyleID="s208"/>
                        <Cell ss:StyleID="s208"/>
                        <Cell ss:StyleID="s208"/>
                        <Cell ss:StyleID="s208"/>
                        <Cell ss:StyleID="s208"/>
                        <Cell ss:StyleID="s209"/>
                       </Row>
                      </Table>
                      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
                       <PageSetup>
                        <Header x:Margin="0.3"/>
                        <Footer x:Margin="0.3"/>
                        <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
                       </PageSetup>
                       <Unsynced/>
                       <PageBreakZoom>60</PageBreakZoom>
                       <Panes>
                        <Pane>
                         <Number>3</Number>
                         <ActiveRow>5</ActiveRow>
                         <ActiveCol>7</ActiveCol>
                        </Pane>
                       </Panes>
                       <ProtectObjects>False</ProtectObjects>
                       <ProtectScenarios>False</ProtectScenarios>
                      </WorksheetOptions>
                     </Worksheet>
           
             `;

            return xmlStr;
        }


        function sheet3(declarationData){

            var xmlStr = '';
            console.log("返回数据", declarationData)
            xmlStr += `	 
            <Worksheet ss:Name="箱单">
                <Table ss:ExpandedColumnCount="9999" ss:ExpandedRowCount="9999" x:FullColumns="1"
                       x:FullRows="1" ss:DefaultRowHeight="14.55">
                    <Column ss:AutoFitWidth="0" ss:Width="78.599999999999994"/>
                    <Column ss:AutoFitWidth="0" ss:Width="103.8"/>
                    <Column ss:Index="5" ss:AutoFitWidth="0" ss:Width="68.399999999999991"/>
                    <Column ss:AutoFitWidth="0" ss:Width="119.4"/>
                    <Column ss:AutoFitWidth="0" ss:Width="121.8"/>
                    <Row ss:AutoFitHeight="0" ss:Height="15.45">
                        <Cell ss:StyleID="s151"/>
                        <Cell ss:StyleID="s152"/>
                        <Cell ss:StyleID="s152"/>
                        <Cell ss:StyleID="s153"/>
                        <Cell ss:StyleID="s154"/>
                        <Cell ss:StyleID="s152"/>
                        <Cell ss:StyleID="s155"/>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="15.45">
                        <Cell ss:StyleID="s156"/>
                        <Cell ss:MergeAcross="3" ss:MergeDown="1" ss:StyleID="s521"><Data
                            ss:Type="String">  装  箱  单&#10;  PACKING LIST</Data></Cell>
                        <Cell ss:StyleID="s148"/>
                        <Cell ss:StyleID="s157"/>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="52.199999999999996">
                        <Cell ss:StyleID="s158"/>
                        <Cell ss:Index="6" ss:StyleID="s159"><ss:Data ss:Type="String"
                                                                      xmlns="http://www.w3.org/TR/REC-html40">日期<Font html:Face="Times New Roman"
                                                                                                                        x:Family="Roman">&#10;Date</Font><Font>：</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s160"><Data ss:Type="DateTime">${declarationData[0].yesterdayStr}</Data></Cell>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="63">
                        <Cell ss:StyleID="s156"/>
                        <Cell ss:StyleID="s161"/>
                        <Cell ss:StyleID="s162"/>
                        <Cell ss:StyleID="s145"/>
                        <Cell ss:StyleID="s163"/>
                        <Cell ss:StyleID="s164"><ss:Data ss:Type="String"
                                                         xmlns="http://www.w3.org/TR/REC-html40">发票编号<Font html:Face="Times New Roman"
                                                                                                               x:Family="Roman">&#10;Invoice No:</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s165"><Data ss:Type="String">${declarationData[0].htxyh}</Data></Cell>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="47.55">
                        <Cell ss:StyleID="s166"><ss:Data ss:Type="String"
                                                         xmlns="http://www.w3.org/TR/REC-html40">客户<Font html:Size="11">&#10;To Messrs:</Font></ss:Data></Cell>
                        <Cell ss:MergeAcross="3" ss:StyleID="s512"><Data ss:Type="String">${declarationData[0].jwshr}</Data></Cell>
                        <Cell ss:StyleID="s164"><ss:Data ss:Type="String"
                                                         xmlns="http://www.w3.org/TR/REC-html40">合同号<Font html:Face="Times New Roman"
                                                                                                             x:Family="Roman">&#10;Contract No:</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s165"><Data ss:Type="String">${declarationData[0].htxyh}</Data></Cell>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="31.200000000000003">
                        <Cell ss:StyleID="s167"/>
                        <Cell ss:StyleID="s168"/>
                        <Cell ss:StyleID="s168"><Data ss:Type="String">&#10;</Data></Cell>
                        <Cell ss:MergeAcross="1" ss:StyleID="s143"/>
                        <Cell ss:StyleID="s169"/>
                        <Cell ss:StyleID="s170"/>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="52.8">
                        <Cell ss:StyleID="s171"><ss:Data ss:Type="String"
                                                         xmlns="http://www.w3.org/TR/REC-html40">船名<Font html:Face="Times New Roman"
                                                                                                           x:Family="Roman">&#10;Shipped by</Font><Font>：</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s172"/>
                        <Cell ss:StyleID="s139"><Data ss:Type="String">由（${declarationData[0].ljka}） 至（${declarationData[0].zyg}）</Data></Cell>
                        <Cell ss:MergeAcross="1" ss:StyleID="s522"><Data ss:Type="String"></Data></Cell>
                        <Cell ss:StyleID="s164"><ss:Data ss:Type="String"
                                                         xmlns="http://www.w3.org/TR/REC-html40">付款条件<Font html:Size="9">&#10;Terms of Payment:</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s173"><Data ss:Type="String">电汇</Data></Cell>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="15.45">
                        <Cell ss:StyleID="s171"/>
                        <Cell ss:StyleID="s174"/>
                        <Cell ss:StyleID="s139"/>
                        <Cell ss:StyleID="s143"/>
                        <Cell ss:StyleID="s150"/>
                        <Cell ss:StyleID="s164"/>
                        <Cell ss:StyleID="s175"/>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="78">
                        <Cell ss:StyleID="s176"><Data ss:Type="String">箱号&#10;Ctn.No.</Data></Cell>
                        <Cell ss:StyleID="s177"><Data ss:Type="String">货物名称及规格&#10;Description</Data></Cell>
                        <Cell ss:StyleID="s178"><Data ss:Type="String">箱数：&#10;Pkg：</Data></Cell>
                        <Cell ss:MergeAcross="1" ss:StyleID="m211420376"><Data ss:Type="String">数量：&#10;Ge.Quantity</Data></Cell>
                        <Cell ss:StyleID="s179"><Data ss:Type="String">毛重(KG)：&#10;G.W.(KG):</Data></Cell>
                        <Cell ss:StyleID="s180"><Data ss:Type="String">净重(KG)：&#10;N.W.(KG):</Data></Cell>
                    </Row>
                      <!--第一条数据-->
                    <Row ss:AutoFitHeight="0" ss:Height="15.45">\`;
                         <Cell ss:MergeDown="${declarationData[0].lineData.length-1}" ss:StyleID="m211420396"><Data ss:Type="String">N/M</Data></Cell>
                         <Cell ss:StyleID="s181"><Data ss:Type="String">${declarationData[0].lineData[0].spmc}</Data></Cell>
                         <Cell ss:StyleID="s182"><Data ss:Type="String">${declarationData[0].lineData[0].js}</Data></Cell>
                         <Cell ss:StyleID="s183"><Data ss:Type="String">${declarationData[0].lineData[0].sl}</Data></Cell>
                         <Cell ss:StyleID="s184"><Data ss:Type="String">${declarationData[0].lineData[0].script}</Data></Cell>
                         <Cell ss:StyleID="s146"><Data ss:Type="String">${declarationData[0].lineData[0].mz}</Data></Cell>
                         <Cell ss:StyleID="s185"><Data ss:Type="String">${declarationData[0].lineData[0].jz}</Data></Cell>
                     </Row>\`;
                    
             `;



            declarationData[0].lineData.forEach((item,index) => {
                // 排除第一条数据
                if(index >= 1) {
                    xmlStr += `<Row ss:AutoFitHeight="0" ss:Height="15.45">`;
                    xmlStr += `<Cell ss:Index="2" ss:StyleID="s181"><Data ss:Type="String">${item.spmc}</Data></Cell>`;
                    xmlStr += `<Cell ss:StyleID="s182"><Data ss:Type="String">${item.js}</Data></Cell>`;
                    xmlStr += `<Cell ss:StyleID="s183"><Data ss:Type="String">${item.sl}</Data></Cell>`;
                    xmlStr += `<Cell ss:StyleID="s184"><Data ss:Type="String">${item.script}</Data></Cell>`;
                    xmlStr += `<Cell ss:StyleID="s187"><Data ss:Type="String">${item.mz}</Data></Cell>`;
                    xmlStr += `<Cell ss:StyleID="s185"><Data ss:Type="String">${item.jz}</Data></Cell>`;

                    xmlStr += `</Row>`;

                }
            });


            xmlStr += `
                <Row ss:AutoFitHeight="0" ss:Height="31.200000000000003">
                        <Cell ss:StyleID="s188"><Data ss:Type="String">合计&#10;Total</Data></Cell>
                        <Cell ss:StyleID="s189"/>
                        <Cell ss:StyleID="s190"><Data ss:Type="String">${declarationData[0].totalPieces}</Data></Cell>
                        <Cell ss:StyleID="s191"/>
                        <Cell ss:StyleID="s192"/>
                        <Cell ss:StyleID="s193"><Data ss:Type="String">${declarationData[0].totalGrossWeight}</Data></Cell>
                        <Cell ss:StyleID="s194"><Data ss:Type="String">${declarationData[0].totalNetWeight}</Data></Cell>
                    </Row>
                    <Row ss:AutoFitHeight="0">
                        <Cell ss:MergeDown="1" ss:StyleID="m211420256"><Data ss:Type="String">唛头&#10;Marks</Data></Cell>
                        <Cell ss:MergeAcross="5" ss:MergeDown="1" ss:StyleID="s150"/>
                    </Row>
                    <Row ss:AutoFitHeight="0" ss:Height="25.8"/>
                </Table>
                    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
                        <PageSetup>
                            <Header x:Margin="0.3"/>
                            <Footer x:Margin="0.3"/>
                            <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
                        </PageSetup>
                        <Unsynced/>
                        <Zoom>85</Zoom>
                        <PageBreakZoom>60</PageBreakZoom>
                        <Panes>
                            <Pane>
                                <Number>3</Number>
                                <ActiveRow>4</ActiveRow>
                                <ActiveCol>18</ActiveCol>
                            </Pane>
                        </Panes>
                        <ProtectObjects>False</ProtectObjects>
                        <ProtectScenarios>False</ProtectScenarios>
                    </WorksheetOptions>
                </Worksheet>
           
             `;

            return xmlStr;
        }


        function sheet4(declarationData){

            var xmlStr = '';
            console.log("返回数据", declarationData)
            xmlStr += `	 
            
            <Worksheet ss:Name="合同">
              <Table ss:ExpandedColumnCount="9999" ss:ExpandedRowCount="9999" x:FullColumns="1"
               x:FullRows="1" ss:DefaultRowHeight="14.4">
               <Column ss:AutoFitWidth="0" ss:Width="124.2"/>
               <Column ss:Width="32.4"/>
               <Column ss:Width="48.6"/>
               <Column ss:Width="122.39999999999999"/>
               <Column ss:Width="115.80000000000001"/>
               <Column ss:Width="33.6"/>
               <Row ss:Height="30.599999999999998">
                <Cell ss:MergeAcross="7" ss:StyleID="m211422944"><ss:Data ss:Type="String"
                  xmlns="http://www.w3.org/TR/REC-html40"><B>合<Font html:Face="Times New Roman"
                    x:Family="Roman">       </Font><Font>同</Font><Font html:Size="22">&#10;</Font><U><Font
                     html:Size="22">SALES </Font></U></B><U><Font html:Face="Times New Roman"
                    x:Family="Roman" html:Size="20">CONTRACT</Font></U></ss:Data></Cell>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s252"><ss:Data ss:Type="String"
                  xmlns="http://www.w3.org/TR/REC-html40">       <Font html:Face="宋体"
                   x:CharSet="134">卖</Font><Font>    </Font><Font html:Face="宋体"
                   x:CharSet="134">方：</Font></ss:Data></Cell>
                <Cell ss:MergeAcross="2" ss:MergeDown="1" ss:StyleID="s526"><Data
                  ss:Type="String">${declarationData[0].jnfhr}</Data></Cell>
                <Cell ss:StyleID="s109"/>
                <Cell ss:StyleID="s108"/>
                <Cell ss:MergeAcross="1" ss:StyleID="m211422964"/>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s252"><Data ss:Type="String">    Sellers:</Data></Cell>
                <Cell ss:Index="5" ss:StyleID="s110"/>
                <Cell ss:MergeAcross="2" ss:StyleID="m211422984"/>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s253"><ss:Data ss:Type="String"
                  xmlns="http://www.w3.org/TR/REC-html40">    <Font html:Face="宋体"
                   x:CharSet="134">地</Font><Font>    </Font><Font html:Face="宋体"
                   x:CharSet="134">址：</Font></ss:Data></Cell>
                <Cell ss:MergeAcross="2" ss:MergeDown="1" ss:StyleID="m211423084"><Data
                  ss:Type="String"></Data></Cell>
                <Cell ss:StyleID="s112"/>
                <Cell ss:StyleID="s113"/>
                <Cell ss:MergeAcross="1" ss:StyleID="m211423004"/>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s253"><Data ss:Type="String"> Address:  </Data></Cell>
                <Cell ss:Index="5" ss:StyleID="s109"><Data ss:Type="String">    合同号码</Data></Cell>
                <Cell ss:StyleID="s108"/>
                <Cell ss:MergeAcross="1" ss:StyleID="m211423024"/>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s253"><Data ss:Type="String">    电    话：     </Data></Cell>
                <Cell ss:MergeDown="1" ss:StyleID="m211423104"><Data ss:Type="String"></Data></Cell>
                <Cell ss:StyleID="s114"><Data ss:Type="String">传  真</Data></Cell>
                <Cell ss:MergeDown="1" ss:StyleID="m211421152"><Data ss:Type="String"></Data></Cell>
                <Cell ss:StyleID="s110"><Data ss:Type="String">  Contract No:</Data></Cell>
                <Cell ss:MergeAcross="2" ss:StyleID="m211423044"><Data ss:Type="String">${declarationData[0].htxyh}</Data></Cell>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s254"><Data ss:Type="String">    TEL:</Data></Cell>
                <Cell ss:Index="3" ss:StyleID="s116"><Data ss:Type="String">FAX:</Data></Cell>
                <Cell ss:Index="5" ss:StyleID="s110"><Data ss:Type="String">    日     期</Data></Cell>
                <Cell ss:StyleID="s111"/>
                <Cell ss:MergeAcross="1" ss:StyleID="m211423124"/>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s255"><ss:Data ss:Type="String"
                  xmlns="http://www.w3.org/TR/REC-html40">  买<Font html:Face="Times New Roman"
                   x:Family="Roman">  </Font><Font>方：</Font></ss:Data></Cell>
                <Cell ss:MergeAcross="2" ss:MergeDown="1" ss:StyleID="m211421212"><Data
                  ss:Type="String">${declarationData[0].jwshr}</Data></Cell>
                <Cell ss:StyleID="s110"><Data ss:Type="String">    Date:</Data></Cell>
                <Cell ss:MergeAcross="2" ss:StyleID="m211422720"><Data ss:Type="DateTime">${declarationData[0].contractDateStr}</Data></Cell>
               </Row>
               <Row>
                <Cell ss:StyleID="s252"><Data ss:Type="String">  Buyers：</Data></Cell>
                <Cell ss:Index="5" ss:StyleID="s117"><Data ss:Type="String">签约地点（离境口岸）</Data></Cell>
                <Cell ss:StyleID="s118"/>
                <Cell ss:MergeAcross="1" ss:StyleID="m211422740"/>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s252"><Data ss:Type="String">  地   址：</Data></Cell>
                <Cell ss:MergeAcross="2" ss:MergeDown="1" ss:StyleID="m211420928"><Data
                  ss:Type="String"></Data></Cell>
                <Cell ss:StyleID="s110"><Data ss:Type="String">  Signed at:</Data></Cell>
                <Cell ss:MergeAcross="2" ss:StyleID="m211422760"><Data ss:Type="String">${declarationData[0].ljka}</Data></Cell>
               </Row>
               <Row>
                <Cell ss:StyleID="s252"><Data ss:Type="String">Address:</Data></Cell>
                <Cell ss:Index="5" ss:MergeDown="1" ss:StyleID="s545"><Data ss:Type="String">成交方式：&#10;Trade Term:</Data></Cell>
                <Cell ss:MergeDown="1" ss:StyleID="s578"><Data ss:Type="String">${declarationData[0].cjfs}</Data></Cell>
                <Cell ss:MergeAcross="1" ss:MergeDown="1" ss:StyleID="m211420948"><Data
                  ss:Type="String">${declarationData[0].ljkaChar}</Data></Cell>
               </Row>
               <Row>
                <Cell ss:StyleID="s252"><Data ss:Type="String"> 电   话 </Data></Cell>
                <Cell ss:MergeDown="1" ss:StyleID="m211421028"><Data ss:Type="String"></Data></Cell>
                <Cell ss:StyleID="s119"><ss:Data ss:Type="String"
                  xmlns="http://www.w3.org/TR/REC-html40">  <Font html:Face="宋体"
                   x:CharSet="134">传</Font><Font>  </Font><Font html:Face="宋体" x:CharSet="134">真</Font><Font>  </Font></ss:Data></Cell>
                <Cell ss:MergeDown="1" ss:StyleID="m211421172"><Data ss:Type="String"></Data></Cell>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s254"><Data ss:Type="String"> TEL:</Data></Cell>
                <Cell ss:Index="3" ss:StyleID="s115"><Data ss:Type="String">FAX:</Data></Cell>
                <Cell ss:Index="5" ss:StyleID="s120"/>
                <Cell ss:StyleID="s120"/>
                <Cell ss:MergeAcross="1" ss:StyleID="m211422780"/>
               </Row>
               <Row ss:Height="15.600000000000001">
                <Cell ss:StyleID="s256"><Data ss:Type="String">经买卖双方确认根据下列条款订立本合同</Data></Cell>
                <Cell ss:StyleID="s87"/>
                <Cell ss:StyleID="s120"/>
                <Cell ss:StyleID="s120"/>
                <Cell ss:StyleID="s120"/>
                <Cell ss:StyleID="s120"/>
                <Cell ss:MergeAcross="1" ss:StyleID="m211422800"/>
               </Row>
               <Row ss:Height="15">
                <Cell ss:MergeAcross="7" ss:StyleID="m211422496"><Data ss:Type="String">This contract is made out by the Sellers and Buyers as per the following terms and conditions mutuilly confirmed:</Data></Cell>
               </Row>
               <Row ss:Height="15">
                <Cell ss:MergeAcross="1" ss:StyleID="m211422516"><ss:Data ss:Type="String"
                  xmlns="http://www.w3.org/TR/REC-html40">(1)<Font html:Face="宋体"
                   x:CharSet="134">货物名称</Font></ss:Data></Cell>
                <Cell ss:StyleID="s121"><Data ss:Type="String">(2) 数 量</Data></Cell>
                <Cell ss:StyleID="s121"><Data ss:Type="String">(3)单 位</Data></Cell>
                <Cell ss:StyleID="s121"><Data ss:Type="String">(4)单价</Data></Cell>
                <Cell ss:MergeAcross="2" ss:StyleID="m211422536"><ss:Data ss:Type="String"
                  xmlns="http://www.w3.org/TR/REC-html40"> (5)   <Font html:Face="宋体"
                   x:CharSet="134">金</Font><Font>  </Font><Font html:Face="宋体" x:CharSet="134">额</Font></ss:Data></Cell>
               </Row>
               <Row>
                <Cell ss:MergeAcross="1" ss:StyleID="m211422556"><Data ss:Type="String">Name of commodity </Data></Cell>
                <Cell ss:StyleID="s122"><Data ss:Type="String">Quantity</Data></Cell>
                <Cell ss:StyleID="s122"><Data ss:Type="String">Unit</Data></Cell>
                <Cell ss:StyleID="s122"><Data ss:Type="String">Unit Price</Data></Cell>
                <Cell ss:MergeAcross="2" ss:StyleID="m211422576"><Data ss:Type="String">Amount</Data></Cell>
               </Row>
  
             `;

            declarationData[0].lineData.forEach((item,index) => {
                xmlStr += `<Row ss:Height="15.600000000000001">`;
                xmlStr += `<Cell ss:MergeAcross="1" ss:StyleID="m211422596"><Data ss:Type="String">${item.spmc}</Data></Cell>`;
                xmlStr += `<Cell ss:StyleID="s123"><Data ss:Type="String">${item.sl}</Data></Cell>`;
                xmlStr += `<Cell ss:StyleID="s124"><Data ss:Type="String">${item.danw}</Data></Cell>`;
                xmlStr += `<Cell ss:StyleID="s125"><Data ss:Type="String">${item.dj}</Data></Cell>`;
                xmlStr += `<Cell ss:StyleID="s126"><Data ss:Type="String">${item.bz}</Data></Cell>`;
                xmlStr += `<Cell ss:MergeAcross="1" ss:StyleID="m211422616"><Data ss:Type="String">${item.amount}</Data></Cell>`;

                xmlStr += `</Row>`;

            });

            xmlStr += `
                <Row ss:Height="15.600000000000001">
                        <Cell ss:MergeAcross="1" ss:StyleID="m211421332"/>
                        <Cell ss:StyleID="s127"/>
                        <Cell ss:StyleID="s83"/>
                        <Cell ss:StyleID="s128"/>
                        <Cell ss:StyleID="s129"/>
                        <Cell ss:MergeAcross="1" ss:StyleID="m211421048"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s256"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">数量及总值允许有<Font
                           html:Face="Times New Roman" x:Family="Roman"> 2 %</Font><Font>的增减。</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s73"/>
                        <Cell ss:StyleID="s120"/>
                        <Cell ss:StyleID="s120"/>
                        <Cell ss:StyleID="s130"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40"><B>   <Font html:Face="宋体"
                            x:CharSet="134">总</Font><Font>      </Font><Font html:Face="宋体"
                            x:CharSet="134">值</Font></B></ss:Data></Cell>
                        <Cell ss:MergeDown="1" ss:StyleID="m211421108"><Data ss:Type="String">${declarationData[0].lineData[0].bz}</Data></Cell>
                        <Cell ss:MergeAcross="1" ss:MergeDown="1" ss:StyleID="m211421272"><Data
                          ss:Type="String">${declarationData[0].totalAmount}</Data></Cell>
                       </Row>
                       <Row>
                        <Cell ss:MergeAcross="3" ss:StyleID="s257"><Data ss:Type="String">2  % more or less both in amount and quantity allowed.                    </Data></Cell>
                        <Cell ss:StyleID="s131"><Data ss:Type="String">Total Amount:</Data></Cell>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s258"><Data ss:Type="String">(6)合同总值（大写）</Data></Cell>
                        <Cell ss:StyleID="s69"/>
                        <Cell ss:StyleID="s133"><Data ss:Type="String">  </Data></Cell>
                        <Cell ss:MergeAcross="3" ss:StyleID="s134"><Data ss:Type="String">${declarationData[0].totalAmountChinese}</Data></Cell>
                        <Cell ss:StyleID="s259"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s257"><Data ss:Type="String">Total Value in Word:  FORTY TWO THOUSAND FOUR HUNDRED AND SEVENTY THREE AND CENTS TWENTY EIGHT ONLY. </Data></Cell>
                        <Cell ss:StyleID="s120"/>
                        <Cell ss:StyleID="s133"/>
                        <Cell ss:StyleID="s134"/>
                        <Cell ss:StyleID="s134"/>
                        <Cell ss:StyleID="s134"/>
                        <Cell ss:StyleID="s134"/>
                        <Cell ss:StyleID="s259"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">(7)<Font html:Face="宋体"
                           x:CharSet="134">包装及唛头</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s102"/>
                        <Cell ss:MergeAcross="5" ss:MergeDown="2" ss:StyleID="m211421292"/>
                       </Row>
                       <Row>
                        <Cell ss:StyleID="s257"><Data ss:Type="String">Packing and shipping Marks:   </Data></Cell>
                        <Cell ss:StyleID="s120"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">(8)<Font html:Face="宋体"
                           x:CharSet="134">装运期</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><Data ss:Type="String">Time of Shipment:    </Data></Cell>
                        <Cell ss:MergeAcross="1" ss:StyleID="s529"><Data ss:Type="DateTime">${declarationData[0].currentday}</Data></Cell>
                        <Cell ss:StyleID="s132"><Data ss:Type="String">之前</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:MergeAcross="1" ss:MergeDown="1" ss:StyleID="m211421312"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">(9)<Font html:Face="宋体"
                           x:CharSet="134">装运口岸和目的地</Font><Font>           </Font><Font html:Face="宋体"
                           x:CharSet="134">${declarationData[0].ljka}</Font><Font>&#45;&#45;-</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s69"><Data ss:Type="String">${declarationData[0].ljka}</Data></Cell>
                        <Cell ss:StyleID="s69"><Data ss:Type="String">准许分批与转船。</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><Data ss:Type="String">Loading Port &amp; Destination:From  Shenzhen&#45;- To Hongkong  with transhipment and partial ship ments allowed</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s261"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><Data ss:Type="String">(10)保险：由买方按发票全部金额110%投保至   为止的    险。按中国海洋运输保险条款为理。</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s120"/>
                        <Cell ss:MergeAcross="1" ss:MergeDown="11" ss:StyleID="m211421232"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s257"><Data ss:Type="String">Insurance:To be covered by the Buyer  for 110% of full invoice value covering   up  to only,subject to C.I.C.</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s136"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><Data ss:Type="String">(11)付款条件     </Data></Cell>
                        <Cell ss:StyleID="s137"><Data ss:Type="String">电汇</Data></Cell>
                        <Cell ss:StyleID="s69"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><Data ss:Type="String">Terms of Payment</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">(12)<Font html:Face="宋体"
                           x:CharSet="134">装运标记</Font></ss:Data></Cell>
                        <Cell ss:MergeAcross="4" ss:MergeDown="1" ss:StyleID="s548"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><Data ss:Type="String">Shipping Marks:</Data></Cell>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s262"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s138"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s262"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s138"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">    <Font html:Face="宋体"
                           x:CharSet="134">买</Font><Font>  </Font><Font html:Face="宋体" x:CharSet="134">方</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">    <Font html:Face="宋体"
                           x:CharSet="134">卖</Font><Font>  </Font><Font html:Face="宋体" x:CharSet="134">方</Font></ss:Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s263"><Data ss:Type="String">THE BUYERS</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"><ss:Data ss:Type="String"
                          xmlns="http://www.w3.org/TR/REC-html40">  <U>THE SELLERS</U></ss:Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="15.600000000000001">
                        <Cell ss:StyleID="s260"><Data ss:Type="String">(Authorized Signature)</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"><Data ss:Type="String">(Authorized Signature)</Data></Cell>
                        <Cell ss:StyleID="s135"/>
                        <Cell ss:StyleID="s135"/>
                       </Row>
                       <Row ss:Height="16.2">
                        <Cell ss:StyleID="s264"/>
                        <Cell ss:StyleID="s265"/>
                        <Cell ss:StyleID="s265"/>
                        <Cell ss:StyleID="s265"/>
                        <Cell ss:StyleID="s265"/>
                        <Cell ss:StyleID="s265"/>
                       </Row>
                      </Table>
                      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
                       <PageSetup>
                        <Header x:Margin="0.3"/>
                        <Footer x:Margin="0.3"/>
                        <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
                       </PageSetup>
                       <PageBreakZoom>60</PageBreakZoom>
                       <Panes>
                        <Pane>
                         <Number>3</Number>
                         <ActiveRow>23</ActiveRow>
                         <ActiveCol>11</ActiveCol>
                        </Pane>
                       </Panes>
                       <ProtectObjects>False</ProtectObjects>
                       <ProtectScenarios>False</ProtectScenarios>
                      </WorksheetOptions>
                     </Worksheet>
    
             `;

            return xmlStr;
        }


        function sheet5(declarationData){
            var xmlStr = '';
            console.log("返回数据", declarationData)
            xmlStr += `	 
              
                 <Worksheet ss:Name="委托书">
                  <Names>
                   <NamedRange ss:Name="Print_Area" ss:RefersTo="='委托书-新'!R1C1:R49C11"/>
                  </Names>
                  <Table ss:ExpandedColumnCount="9999" ss:ExpandedRowCount="9999" x:FullColumns="1"
                   x:FullRows="1" ss:DefaultRowHeight="14.4">
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s65"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s66"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s67"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="17.399999999999999">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s71"><Data ss:Type="String">代 理 报 关 委 托 书</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
<!--                                <Cell ss:StyleID="s69"><Data ss:Type="String">编号：□□□□□□□□□□□</Data><NamedCell-->
<!--                                  ss:Name="Print_Area"/></Cell>-->
                      <Cell ss:StyleID="s69"><Data ss:Type="String">编号：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s72"><Data ss:Type="String"></Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><ss:Data ss:Type="String"
                      xmlns="http://www.w3.org/TR/REC-html40">     我单位现  <B>A</B><Font>   (A逐票、B长期)委托贵公司代理   </Font><B>AB</B><Font>  等通关事宜。（A、填单申报 B、辅助查验 C、</Font></ss:Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><Data ss:Type="String">垫缴税款 D、办理海关证明联 E、审批手册 F、核销手册 G、申办减免税手续 H、其他 ）详见《委托报关协</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><Data ss:Type="String">议》。</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><Data ss:Type="String">    我单位保证遵守《海关法》和国家有关法规，保证所提供的情况真实、完整、单货相符，无侵犯他</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><Data ss:Type="String">人知识产权的行为。否则，愿承担相关法律责任。</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><Data ss:Type="String">    本委托书有效期自签字之日起至     </Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s74"><Data ss:Type="String">    2018 年 12 月 30 日止。</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s75"><Data ss:Type="String">委托方（盖章）：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><Data ss:Type="String">${declarationData[0].jnfhr}</Data><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s75"><Data ss:Type="String">法定代表人或其授权签署《代理报关委托书》的人（签字）</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="s614" ss:Formula="=TODAY()-1"><Data
                      ss:Type="DateTime">${declarationData[0].yesterdayStr}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="17.399999999999999">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s71"><Data ss:Type="String">   委 托 报 关 协 议</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><Data ss:Type="String">为明确委托报关具体事项和各自责任，双方经平等协商签定协议如下：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s76"><Data ss:Type="String">委托方</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211423984"><Data ss:Type="String">${declarationData[0].jnfhr}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s76"><Data ss:Type="String">被委托方</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211424004"><Data ss:Type="String"></Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s77"><Data ss:Type="String">主要货物名称</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211424024"><Data ss:Type="String">${declarationData[0].lineData[0].spmc}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s77"><Data ss:Type="String">*报关单编码</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211424044"><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s78"><Data ss:Type="String">HS编码</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211424064"><Data ss:Type="Number">6910100000</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s78"><Data ss:Type="String">收到单证日期</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211424084" ss:Formula="=TODAY()"><Data
                      ss:Type="DateTime">${declarationData[0].currentDateObj}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s79"><Data ss:Type="String">货物总价</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s80"><Data ss:Type="String">${declarationData[0].lineData[0].bz}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s81"><Data ss:Type="Number">${declarationData[0].totalAmount}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s82"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeDown="3" ss:StyleID="m211423740"><Data ss:Type="String">收到单证情况</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s79"><Data ss:Type="String">合同□√</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="m211423800"><Data ss:Type="String">发票□√</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s79"><Data ss:Type="String">进出口日期</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211423820" ss:Formula="=TODAY()+1"><Data
                      ss:Type="DateTime">${declarationData[0].jckri}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:Index="8" ss:StyleID="s79"><Data ss:Type="String">装箱清单□√</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="m211423840"><Data ss:Type="String">提（运）单□</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s83"><Data ss:Type="String">提单号</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211423860"><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:Index="8" ss:StyleID="s79"><Data ss:Type="String">加工贸易手册□</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="m211423904"><Data ss:Type="String">许可证件□</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s85"><Data ss:Type="String">贸易方式</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211423924"><Data ss:Type="String">${declarationData[0].jgfs}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:Index="8" ss:MergeAcross="2" ss:StyleID="m211423944"><Data
                      ss:Type="String">  其他</Data><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s84"><Data ss:Type="String">原产地/货源地</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211423680"><Data ss:Type="String">${declarationData[0].ljka}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s83"><Data ss:Type="String">报关收费</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="2" ss:StyleID="m211423700"><Data ss:Type="String">  人民币：       元</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s86"><Data ss:Type="String">其他要求：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s87"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s87"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s88"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s86"><Data ss:Type="String">承诺说明：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s87"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s87"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s88"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="3" ss:MergeDown="2" ss:StyleID="m211423760"><Data
                      ss:Type="String">背面所列通用条款是本协议不可分割的一部分，对本协议的签署构成了对背面通用条款的同意。</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="3" ss:MergeDown="2" ss:StyleID="m211423780"><Data
                      ss:Type="String">背面所列通用条款是本协议不可分割的一部分，对本协议的签署构成了对背面通用条款的同意。</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:Index="6" ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:Index="11" ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:Index="6" ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:Index="11" ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s91"><Data ss:Type="String">委托方业务签章：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s92"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s92"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s93"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s86"><Data ss:Type="String">被委托方业务签章：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s92"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s92"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s93"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><Data ss:Type="String">经办人签章：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><Data ss:Type="String">经办报关员签章：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s73"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s90"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><Data ss:Type="String">联系电话：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s96"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s97" ss:Formula="=TODAY()-1"><Data ss:Type="DateTime">${declarationData[0].yesterdayStr}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s89"><Data ss:Type="String">联系电话：</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s98"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:MergeAcross="1" ss:StyleID="s590" ss:Formula="=TODAY()"><Data
                      ss:Type="DateTime">${declarationData[0].currentDateObj}</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s94"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s95"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s99"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s100"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s100"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s101"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s99"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s100"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s100"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s101"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s68"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s102"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s103"><Data ss:Type="String">  （白联：海关留存、黄联：被委托方留存、红联：委托方留存）</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s98"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s102"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s102"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s102"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s104"><Data ss:Type="String">中国报关协会监制</Data><NamedCell
                      ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s102"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s69"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s70"/>
                   </Row>
                   <Row ss:Height="15.600000000000001">
                    <Cell ss:StyleID="s105"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s106"><NamedCell ss:Name="Print_Area"/></Cell>
                    <Cell ss:StyleID="s107"/>
                   </Row>
                  </Table>
                  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
                   <PageSetup>
                    <Header x:Margin="0.3"/>
                    <Footer x:Margin="0.3"/>
                    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
                   </PageSetup>
                   <PageBreakZoom>60</PageBreakZoom>
                   <TopRowVisible>24</TopRowVisible>
                   <Panes>
                    <Pane>
                     <Number>3</Number>
                     <ActiveRow>17</ActiveRow>
                     <ActiveCol>14</ActiveCol>
                    </Pane>
                   </Panes>
                   <ProtectObjects>False</ProtectObjects>
                   <ProtectScenarios>False</ProtectScenarios>
                  </WorksheetOptions>
                 </Worksheet>
                 </Workbook>
                    
             `;



            return xmlStr;
        }


        // 隐藏遮罩层
        function hideOverlay() {
            var timeoutblockerDiv = document.getElementById("timeoutblocker");
            if (timeoutblockerDiv) {
                timeoutblockerDiv.style.display = "none";
            }
        }
        function showMask() {
            var timeoutblocker1 = document.getElementById('timeoutblocker');
            if (timeoutblocker1) {
                timeoutblocker1.style.display = 'block';
                // 强制浏览器重绘
                void timeoutblocker1.offsetHeight;
            }
        }

        /**
         * 输出base64编码
         * @param s
         * @returns {string}
         */
        function base64(s) {
            return window.btoa(unescape(encodeURIComponent(s)));
        }

        return {
            pageInit: pageInit,
            declarationExportExcel: declarationExportExcel,//导出
            declarationVoid: declarationVoid,//作废
        };
    });
