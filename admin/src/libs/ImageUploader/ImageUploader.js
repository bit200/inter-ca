import React from 'react';
import ReactExtender from './../ReactExtender/ReactExtender';
import MyModal from "../MyModal/MyModal";
import './ImageUploader.css';
import DeleteButton from "../DeleteButton/DeleteButton";
import Select from './../Select';
import Hr from './../Hr/Hr';
import Button from './../Button/Button';
import pica from 'pica'; // Import pica library

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

class ImageUploader extends ReactExtender {

    constructor(props) {
        super(props);
        this.id = 'id_' + makeid(10);
        this.src = this.props.src;
        this.state = {aspectRatio: this.props.aspectRatio || 1, loading: true, item: {}, pass_item: {}};
    }

    componentDidMount() {
    }

    setCropper(vv) {
        let _this = this;
        let src = _this.file_src;
        let id = _this.id;
        let el = window.$('#for_' + id);
        el.html(`<img src="${src}" id="${id}" />`);

        let opts = {
            onCropEnd: function (value) {
                _this.cropper_value = value;
            },
            onInitialize: function (value) {
                setTimeout(() => {
                    _this.cropper_value = croppr.getValue();
                })
            }
        };

        let aspectRatio = _this.props.forseAspectRatio || _this.state.aspectRatio;

        if (aspectRatio) {
            opts.aspectRatio = +aspectRatio;
        }

        let croppr = new window.Croppr('#' + id, opts);
    }

    // Compress image before uploading using pica
    compressImage(base64Str, maxWidth = 400, maxHeight = 400, quality = 0.7) {
        return new Promise((resolve, reject) => {
            // Create an image object
            const img = new Image();

            // Set up the image onload handler
            img.onload = function () {
                // Calculate the new dimensions while maintaining aspect ratio
                const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                const newWidth = img.width * ratio;
                const newHeight = img.height * ratio;

                // Create a canvas element to draw the resized image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = newWidth;
                canvas.height = newHeight;

                // Draw the image on the canvas (resizing it)
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Convert the resized image to a Base64 string with a given quality (JPEG format)
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                // Convert the resized image to a Blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedUrl = URL.createObjectURL(blob); // Create a Blob URL
                        // Resolve with both the Blob and Base64 string
                        resolve({blob, compressedUrl: compressedBase64, blobUrl: compressedUrl});
                    } else {
                        reject('Error creating blob');
                    }
                }, 'image/jpeg', quality); // Blob creation with quality set for JPEG
            };

            // Set up the error handler
            img.onerror = function (error) {
                reject('Error loading image: ' + error);
            };

            // Set the image source to the Base64 string
            img.src = base64Str;
        });
    }

    upload(cb) {
        let _this = this;
        this.resize();
        let file = this.dataURL;


        // Compress the image
        this.compressImage(file)
            .then(({blob, compressedUrl}) => {
                const formData = new FormData();
                formData.append('image', blob);
                formData.append('_id', (this.props.item || {})._id);
                this.dataURL = compressedUrl;
                console.log("qqqqq formData!!!!", this.props.onChange);
                global.http.post(this.props.url || '/img-uploader', {
                    base64: compressedUrl,
                    _id: global.user?.get_id(),
                    name: 'profile.jpg'
                }, {domain: env.VIDEO_UPLOAD_DOMAIN})
                    .then((r) => {
                        console.log("qqqqq aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", r);
                        _this.modal && _this.modal.hide();
                        _this.props.onChange && _this.props.onChange({
                            url: r?.url
                        });

                        cb && cb();
                    })
                    .catch(e => {
                        console.log("qqqqq aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa22222222222222222", e.toString());
                        cb && cb();
                    });
            })
            .catch((error) => {
                console.error("Error compressing image: ", error);
                cb && cb();
            });
    }

    resize(cb) {
        cb && cb();

        let cv = this.cropper_value;
        let id = this.id;
        let $ = window.$;

        let sel = '#for_' + id + ' .croppr-imageClipped';
        let sel2 = '#for_' + id + ' img';
        var img = $(sel)[0] || $(sel2)[0];

        var crop_canvas, left = cv.x, top = cv.y, width = cv.width, height = cv.height;

        crop_canvas = $('#canvas_' + id)[0];

        crop_canvas.width = width;
        crop_canvas.height = height;

        crop_canvas.getContext('2d').drawImage(img, left, top, width, height, 0, 0, width, height);
        this.dataURL = crop_canvas.toDataURL("image/png");
    }

    readURL(_inp) {
        let _this = this;
        let inp = window.$(`[relative-id="${this.id}"]`)[0];
        if (inp.files && inp.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                _this.file_src = e.target.result;
                _this.setCropper();
                inp.value = '';
            };
            reader.readAsDataURL(inp.files[0]);
        }
    }

    on_delete() {
        this.onChange && this.onChange({url: ''});
    }

    render() {
        let {inputId, label, placeholder, preview_size = 'full', isDefault} = this.props;

        label = label || placeholder;

        let src = this.props.src;
        return (
            <div className={("afade uploadWrap " + preview_size)}>
                {/*<hr/>*/}

                {/*<input type="file" id="avatar" name="avatar" accept="image/png, image/jpeg"/>*/}
                {/*<hr/>*/}
                {label && <small>{label}</small>}
                <div className="rel img_preview">
                    {/*<div className="photoWrap">*/}
                    {/*<div className="iconoir-camera" style={{fontSize: '100px'}}></div>*/}
                    {/*</div>*/}

                    <div className="profile-circle pointer">
                        <div className="imgWrapLogo pointer">
                            <div className="image-responsive-square"
                                 style={{backgroundImage: `url('${src}')`}}></div>
                        </div>
                        <a className="pointer thumb-md justify-content-center d-flex align-items-center bg-primary text-white rounded-circle position-absolute end-0 bottom-0 border border-3 border-card-bg"
                           href="/profile">
                            <div className="iconoir-camera"></div>
                        </a>
                    </div>
                    <input type='file' relative-id={this.id}
                           style={{
                               position: 'absolute',
                               height: '100%',
                               width: '100%',
                               left: '0',
                               top: '0',
                               cursor: 'pointer',
                               opacity: '0',
                           }}
                           onChange={(el) => {
                               this.readURL(el);
                               this.modal && this.modal.show();
                           }}/>
                    {/*<div id={'preview_' + this.id}>*/}
                    {/*    {src ? <div className={'imgPreviewProfile'}><img src={src}*/}
                    {/*                                                     alt=""/></div> : null}*/}
                    {/*    {!src ? <div className={'tc drop_text'} onClick={() => {*/}
                    {/*    }}>*/}
                    {/*        {t('dropFileToUpload')}*/}
                    {/*    </div> : null}*/}
                    {/*</div>*/}
                </div>
                {/*{src && <div*/}
                {/*    style={{positin: 'absolute', top: 0, right: 0, zIndex: '10', background: 'red'}}*/}
                {/*><DeleteButton opacity={.4} onClick={(e) => {*/}
                {/*    this.on_delete()*/}
                {/*}}></DeleteButton></div>}*/}
                <MyModal ref={(el) => {
                    window.mm = el;
                    this.modal = el
                }}>
                    <div>
                        <div className="ib">
                            <Button size={'sm'} onClick={(e) => {
                                this.upload(e)
                            }}><i className="iconoir-double-check"></i>
                                {t('uploadAvatar')}</Button> <Button
                            color={4}
                            size={'sm'} onClick={(e) => {
                            this.onChange({url: ''})
                        }}>
                            <i className="iconoir-sparks"></i>
                            {t('resetToAvatarDefault')}</Button>
                        </div>

                        {/*<div className="ib" style={{verticalAlign: 'top', marginLeft: '10px'}}>*/}
                        {/*    <Select*/}
                        {/*        items={[*/}
                        {/*            {value: 1, name: '1x1 (avatar)'},*/}
                        {/*            {value: 0, name: 'Any'},*/}
                        {/*            {value: 0.75, name: '4x3 (portfolio)'},*/}
                        {/*            {value: 0.5625, name: '16x9 (youtube)'}*/}
                        {/*        ]}*/}
                        {/*        disabled={this.props.forseAspectRatio}*/}
                        {/*        value={this.props.forseAspectRatio || this.state.aspectRatio}*/}
                        {/*        onChange={(v, a, b, c) => {*/}
                        {/*            this.setState({aspectRatio: +v}, () => {*/}
                        {/*                this.setCropper()*/}
                        {/*            })*/}
                        {/*        }}*/}
                        {/*    ></Select>*/}
                        {/*</div>*/}
                        <hr/>
                        <div id={'for_' + this.id}></div>
                    </div>
                </MyModal>

                <canvas className={'dn'} id={"canvas_" + this.id} style={{opacity: 0}}></canvas>
            </div>
        )
    }
}

export default ImageUploader;
