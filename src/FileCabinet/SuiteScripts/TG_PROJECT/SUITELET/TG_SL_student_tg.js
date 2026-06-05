/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget'], (serverWidget) => {

    const onRequest = (context) => {

        if (context.request.method === 'GET') {

            // 创建表单
            const form = serverWidget.createForm({
                title: '用户信息表单'
            });

            // 姓名
            form.addField({
                id: 'custpage_name',
                type: serverWidget.FieldType.TEXT,
                label: '姓名'
            }).isMandatory = true;

            // 生日
            form.addField({
                id: 'custpage_birthday',
                type: serverWidget.FieldType.DATE,
                label: '生日'
            });

            form.addSubmitButton({ label: '提交' });

            context.response.writePage(form);

        } else {

            // 处理提交的数据
            const name = context.request.parameters.custpage_name;
            const birthday = context.request.parameters.custpage_birthday;

            const form = serverWidget.createForm({
                title: '提交成功'
            });

            form.addField({
                id: 'custpage_result',
                type: serverWidget.FieldType.INLINEHTML,
                label: '结果'
            }).defaultValue = `
                <h3>你提交的信息如下：</h3>
                <p><b>姓名：</b> ${name}</p>
                <p><b>生日：</b> ${birthday}</p>
            `;

            form.addButton({
                id: 'custpage_back',
                label: '返回',
                functionName: "history.back()"
            });

            context.response.writePage(form);
        }
    };

    return { onRequest };
});