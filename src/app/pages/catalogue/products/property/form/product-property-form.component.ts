import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NbDialogRef } from '@nebular/theme';
import { PropertiesService } from '../../services/product-properties';
// import { StorageService } from '../../../../shared/services/storage.service';
import { ConfigService } from '../../../../shared/services/config.service';
import { ProductAttributesService } from '../../services/product-attributes.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'ngx-product-property-form',
    templateUrl: './product-property-form.component.html',
    styleUrls: ['./product-property-form.component.scss']
})
export class ProductPropertyForm implements OnInit {
    product: any;
    attributeId: any;
    attribute: any = {};
    form: FormGroup;
    loader: boolean = false;
    languages: Array<any> = [];
    options: Array<any> = [];
    optionValues: Array<any> = [];
    selectedType: any = '';
    constructor(
        private propertiesService: PropertiesService,
        private configService: ConfigService,
        private productAttributesService: ProductAttributesService,
        private toastr: ToastrService,
        private translate: TranslateService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        protected ref: NbDialogRef<ProductPropertyForm>
    ) {
        this.createForm();
        this.getLanguages();
        this.getProductProperty();
    }
    getLanguages() {
        this.configService.getListOfSupportedLanguages(localStorage.getItem('merchant'))
            .subscribe(data => {
                this.languages = data;
                this.addFormArray();
            }, error => {

            });
    }
    ngAfterViewChecked() {
        //your code to update the model
        this.cdr.detectChanges();
    }
    ngOnInit() {
        if (this.attributeId) {
            this.loader = true;
            this.productAttributesService.getAttributesById(this.product.id, this.attributeId, { lang: '_all' }).subscribe(res => {
                // console.log('---------', res)
                this.attribute = res;
                console.log(res.option)
                setTimeout(() => {
                    this.onChangePropertyOption({ value: res.option.id })
                    this.fillForm();
                }, 1000);
                this.loader = false;
            }, error => {
                this.loader = false;
            });
        }
    }
    getProductProperty() {
        this.propertiesService.getProductProperties("test")
            .subscribe(property => {
                // console.log(property);
                let temp = []
                property.map((data) => {
                    temp.push({ value: data.option.id, label: data.option.name, type: data.option.type, values: data.values })
                });
                this.options = temp;
            });
    }
    private createForm() {
        this.form = this.fb.group({
            option: ['', [Validators.required]],
            optionValue: ['', []],
            descriptions: this.fb.array([]),
        });


    }
    addFormArray() {
        const control = <FormArray>this.form.controls.descriptions;
        this.languages.forEach(lang => {
            control.push(
                this.fb.group({
                    language: [lang.code, []],
                    name: ['', []]
                })
            );
        });
    }

    onChangePropertyOption(e) {
        // console.log('------------', this.options)
        // console.log(e)
        let record = this.options.find((a) => {
            return a.value === e.value
        })
        // console.log(record)
        this.selectedType = record.type;
        if (record.type !== 'text') {
            let temp = [];
            if (record.values && record.values.length > 0) {
                record.values.map((data) => {
                    temp.push({ value: data.id, label: data.name })
                });
                this.optionValues = temp;
            }
            this.form.get('descriptions')['controls'].forEach(c => c.controls.name.clearValidators());
            this.form.controls['optionValue'].setValidators([Validators.required]);
            this.form.controls['optionValue'].updateValueAndValidity();
        } else {
            this.form.controls['optionValue'].clearValidators();
            this.form.get('descriptions')['controls'].forEach(c => c.controls.name.setValidators([Validators.required]));
            this.form.controls['optionValue'].updateValueAndValidity();
        }

    }

    fillForm() {
        // const priceSeparator = this.attribute.productAttributePrice.indexOf('$') + 1;
        // this.currency = this.attribute.productAttributePrice.slice(0, priceSeparator);
        console.log(this.optionValues);
        let index = this.optionValues.findIndex((a) => a.value === this.attribute.optionValue.id);
        console.log(index);
        this.form.patchValue({
            option: this.attribute.option.id,
            optionValue: index === -1 ? '' : this.attribute.optionValue.id,
            descriptions: []
        });
        this.fillFormArray()
    }
    fillFormArray() {
        this.form.value.descriptions.forEach((desc, index) => {
            this.attribute.optionValue.descriptions.forEach((description) => {
                // console.log(description)
                if (desc.language === description.language) {

                    (<FormArray>this.form.get('descriptions')).at(index).patchValue({
                        language: description.language,
                        name: description.name
                    });
                }
            });
        });
    }
    get option() {
        return this.form.get('option');
    }

    get optionValue() {
        return this.form.get('optionValue');
    }
    get descriptions(): FormArray {
        return <FormArray>this.form.get('descriptions');
    }

    save() {
        console.log(this.form.value);
        let param = {};
        if (this.selectedType === 'text') {
            param = {
                "attributeDefault": false,
                "attributeDisplayOnly": true,
                "option": {
                    "id": this.form.value.option
                },
                "optionValue": {
                    "descriptions": this.form.value.descriptions
                },
                "sortOrder": 0
            }
        } else {
            param = {
                "attributeDefault": false,
                "attributeDisplayOnly": true,
                "option": {
                    "id": this.form.value.option
                },
                "optionValue": { id: this.form.value.optionValue },
                "sortOrder": 1
            }
        }
        this.loader = true;
        if (this.attribute.id) {
            this.productAttributesService.updateAttribute(this.product.id, this.attributeId, param)
                .subscribe(res => {
                    this.loader = false;
                    // this.attribute = res;
                    this.goToback();
                    this.toastr.success(this.translate.instant('PROPERTY.PRODUCT_PROPERTY_UPDATED'));
                }, error => {
                    this.loader = false;
                });;
        } else {
            this.productAttributesService.createAttribute(this.product.id, param).subscribe(res => {
                this.loader = false;
                this.goToback();
                this.toastr.success(this.translate.instant('PROPERTY.PRODUCT_PROPERTY_CREATED'));
            }, error => {
                this.loader = false;
            });
        }
    }
    goToback() {
        this.ref.close();
    }

}