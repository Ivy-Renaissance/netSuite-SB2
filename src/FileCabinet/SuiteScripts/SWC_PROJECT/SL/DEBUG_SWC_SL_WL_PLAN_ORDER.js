/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
require(['N/search', 'N/record', 'N/log'],
    function (search, record, log) {

        const poRec = record.load({
            type: 'purchaseorder',
            id: 7259,
            isDynamic: false // 用 setSublistValue(line=) 更稳
        });

        var poItemQtyJson = { 517_1_1_1: { totalQty: 9, lines: [ { lineIndex: 0, lineNo: 1, qty: 20 }, { lineIndex: 8, lineNo: 7, qty: 20 } ] }, 524_1_1_1: { totalQty: 9, lines: [ { lineIndex: 15, lineNo: 12, qty: 15 }, { lineIndex: 21, lineNo: 18, qty: 16 } ] } }
        // 对每个 key 做分摊并回写
        for (const key in poItemQtyJson) {

            const bucket = poItemQtyJson[key];
            const totalQty = Number(bucket.totalQty) || 0; // 这次要分摊的总数量
            var dftQty = []; // 每一行剩余可分摊数量
            const lines = bucket.lines;
            var dftQtyQty = 0;// 这次分摊总数量之和
            for (let i = 0; i < lines.length; i++) {
                dftQty.push(lines[i].qty)
                dftQtyQty += Number(lines[i].qty)
            }
            var getAry = splitByProportion(dftQty, totalQty, dftQtyQty);
            for (let ag = 0; ag < getAry.length; ag++) {
                var newQty = getAry[ag];
                var oldWlQty2 = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swc_wl_qty', line: lines[ag].lineNo });
                poRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_swc_wl_qty',
                    line: lines[ag].lineNo,
                    value: (Number(newQty) || 0) + Number(oldWlQty2)
                });

                var  a = '';
            }
        }


        function splitByProportion(regions, newSum, totalRegion) {
            // 计算每个区域按比例拆分的基础值
            var baseValues = [];
            var regionSum = 0;
            for (var j = 0; j < regions.length; j++) {
                // 如果该区域的原始数量为0，则基础值为0，不参与尾差分配
                if (regions[j] === 0) {
                    baseValues[j] = 0;
                } else {
                    // 按比例计算，向下取整
                    baseValues[j] = Math.floor(regions[j] * (newSum / totalRegion));
                }
                regionSum += baseValues[j];
            }

            var diff = newSum - regionSum; // 尾差

            // 创建一个数组，包含所有非零区域的索引，并按照小数部分从大到小排序
            var indices = [];
            for (var j = 0; j < regions.length; j++) {
                if (regions[j] !== 0) {
                    indices.push(j);
                }
            }

            // 计算每个区域比例的小数部分
            var decimals = [];
            for (var j = 0; j < indices.length; j++) {
                var idx = indices[j];
                decimals.push(regions[idx] * (newSum / totalRegion) - baseValues[idx]);
            }

            // 按照小数部分从大到小排序索引数组（仅非零区域）
            for (var j = 0; j < indices.length - 1; j++) {
                for (var k = j + 1; k < indices.length; k++) {
                    if (decimals[j] < decimals[k]) {
                        var temp = indices[j];
                        indices[j] = indices[k];
                        indices[k] = temp;
                        var tempDec = decimals[j];
                        decimals[j] = decimals[k];
                        decimals[k] = tempDec;
                    }
                }
            }

            // 将尾差分配给前diff个区域（每个区域加1）
            for (var j = 0; j < diff; j++) {
                var idx = indices[j];
                baseValues[idx] += 1;
            }

            return baseValues;
        }

    });
