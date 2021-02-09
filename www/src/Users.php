  
<?php
/**
 * @Entity @Table(name="products")
 */
class Role
{
    /** @Id @Column(type="integer") @GeneratedValue */
    protected $id;

    /** @Column(type="string") */
    protected $organizations;

    /** @Column(type="string") */
    protected $roles;

    /** @Column(type="string") */
    protected $manage;

    /** @Column(type="boolean") */
    protected $admin;


    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }

    public function setName($name)
    {
        $this->name = $name;
    }
}
