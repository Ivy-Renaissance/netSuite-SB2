/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/ui/serverWidget'],
    /**
 * @param{log} log
 * @param{serverWidget} serverWidget
 */
    (log, serverWidget) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const request = scriptContext.request;
            const response = scriptContext.response;

            try {
                if(request.method === 'GET'){
                    // 显示表单页面
                    showForm(scriptContext);
                }else if(request.method === 'POST'){
                    // 处理表单提交
                    processForm(scriptContext);
                }
            } catch (error) {
                log.error({
                    title: 'Suitelet 执行错误！',
                    details: error.toString()
                });
                showErrorPage(response, error.toString());
            }
        }

        /**
         * 显示表单页面
         */
        function showForm(scriptContext){
            const form = serverWidget.createForm({
                title:'客户联系表单',
                hideNavBar: false
            });

            // 添加客户信息字段组
            const customerFieldGroup = form.addFieldGroup({
                id: 'custpage_customer_info',
                label: '客户信息'
            });

            // 姓名字段
            const nameField = form.addField({
                id: 'cusipage_name',
                type: serverWidget.FieldType.TEXT,
                label: '姓名',
                container: 'custpage_customer_info'
            });
            nameField.isMandatory = true;   // 字段是否必选 - 是
            nameField.helpText = '请输入您的全名';

            // 邮箱字段
            const emailField = form.addField({
                id: 'custpage_email',
                type: serverWidget.FieldType.EMAIL,
                label: '电子邮箱',
                container: 'custpage_customer_info'
            });
            emailField.isMandatory = true;

            // 电话字段
            const phoneField = form.addField({
                id: 'custpage_phone',
                type: serverWidget.FieldType.PHONE,
                label: '联系电话',
                container: 'custpage_customer_info'
            });

            // 添加联系信息字段组
            const contactFieldGroup = form.addFieldGroup({
                id: 'custpage_contact_info',
                type: serverWidget.FieldType.FIELDGROUP,
                label: '联系信息',
            });

            // 主题字段
            const subjectField = form.addField({
                id: 'custpage_subject',
                type: serverWidget.FieldType.SELECT,
                label: '联系主题',
                container: 'custpage_contact_info'
            });
            subjectField.isMandatory = true;
            subjectField.addSelectOption({
                value: '',
                text: '请选择主题',
            });
            subjectField.addSelectOption({
                value: 'inquiry',
                text: '产品资讯',
            });
            subjectField.addSelectOption({
                value: 'support',
                text: '技术支持',
            });
            subjectField.addSelectOption({
                value: 'complaint',
                text: '投诉建议',
            });
            subjectField.addSelectOption({
                value: 'other',
                text: '其他',
            });

            // 消息字段
            const messageField = form.addField({
                id: 'custpage_message',
                type: serverWidget.FieldType.TEXTAREA,
                label: '详细消息',
                container: 'custpage_contact_info'
            });
            messageField.isMandatory = true;
            messageField.helpText = '请详细描述您的问题';
            messageField.displaySize = {
                width: 600,
                height: 150,
            };

            // 优先级字段
            const priorityField = form.addField({
                id: 'custpage_priority',
                type: serverWidget.FieldType.RADIO,
                label: '优先级',
                container: 'custpage_contact_info'
            });
            priorityField.addSelectOption({
                value: 'low',
                text: '低',
            });
            priorityField.addSelectOption({
                value: 'medium',
                text: '中',
            });
            priorityField.addSelectOption({
                value: 'high',
                text: '高',
            });
            priorityField.defaultValue = 'medium';

            // 设置提交按钮
            form.addSubmitButton({
                label: '提交表单'
            });
            form.addResetButton({
                label: '重制'
            });

            scriptContext.response.writePage(form);

        }

        /**
         * 处理表单提交
         */
        function processForm(scriptContext){
            const request = scriptContext.request;
            const response = scriptContext.response;

            // 获取表单数据
            const formData = {
                name: request.parameters.custpage_name,
                email: request.parameters.custpage_email,
                phone: request.parameters.custpage_phone || '未提供',
                subject: request.parameters.custpage_subject,
                message: request.parameters.custpage_message,
                priority: request.parameters.custpage_priority || 'medium',
                submitted: new Date()
            };

            // 记录日志
            log.audit({
                title: '表单提交记录',
                details: JSON.stringify(formData)
            });

            // 显示成功页面
            showSuccessPage(response, formData);
        }


        /**
         * 显示成功页面
         */
        function showSuccessPage(response, formData){
            const subjectText = getSubjectText(formData.subject);
            const priorityText = getPriorityText(formData.priority);

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>提交成功</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        .success { color: #155724; background-color: #d4edda; padding: 20px; border-radius: 5px; }
                        .info-box { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-left: 4px solid #007cba; }
                        .back-link { margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="success">
                        <h1>✅ 提交成功！</h1>
                        <p>感谢您的提交，我们会在24小时内回复您。</p>
                    </div>
                    
                    <div class="info-box">
                        <h2>提交信息摘要</h2>
                        <p><strong>姓名：</strong>${formData.name}</p>
                        <p><strong>邮箱：</strong>${formData.email}</p>
                        <p><strong>电话：</strong>${formData.phone}</p>
                        <p><strong>主题：</strong>${subjectText}</p>
                        <p><strong>优先级：</strong>${priorityText}</p>
                        <p><strong>提交时间：</strong>${formData.submitted.toLocaleString()}</p>
                        <p><strong>消息内容：</strong><br>${formData.message.replace(/\n/g, '<br>')}</p>
                    </div>
                    
                    <div class="back-link">
                        <a href="javascript:history.back()">返回修改</a> | 
                        <a href="${scriptContext.request.parameters._app || '/'}">返回首页</a>
                    </div>
                </body>
                </html>
            `;

            response.write(html);
        }

        /**
         * 显示错误页面
         */
        function showErrorPage(response, errorMessage) {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>系统错误</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        .error { color: #721c24; background-color: #f8d7da; padding: 20px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h1>❌ 系统错误</h1>
                        <p>抱歉，处理您的请求时出现错误：</p>
                        <p><strong>${errorMessage}</strong></p>
                        <p>请稍后重试或联系系统管理员。</p>
                    </div>
                </body>
                </html>
            `;

            response.write(html);
        }

        /**
         * 获取主题文本
         */
        function getSubjectText(subjectValue) {
            const subjects = {
                'inquiry': '产品咨询',
                'support': '技术支持',
                'complaint': '投诉建议',
                'other': '其他'
            };
            return subjects[subjectValue] || subjectValue;
        }

        /**
         * 获取优先级文本
         */
        function getPriorityText(priorityValue) {
            const priorities = {
                'low': '低',
                'medium': '中',
                'high': '高'
            };
            return priorities[priorityValue] || priorityValue;
        }

        return {onRequest}

    });
