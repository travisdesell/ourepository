<?php

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;


/**
 * @ORM\Entity @ORM\Table(name="users")
 */
class User
{
    /** @ORM\Id @ORM\Column(type="integer") @ORM\GeneratedValue */
    protected $id;

    /**
     * One product has many features. This is the inverse side.
     * @ORM\OneToMany(targetEntity="MemberRole", mappedBy="members")
     */
    protected $memberRoles;


    /** @ORM\Column(type="string") */
    protected $name;

    /** @ORM\Column(type="string") */
    protected $shake;

    /** @ORM\Column(type="string") */
    protected $hash;

    /** @ORM\Column(type="boolean") */
    protected $admin;

    public function __construct() {
        $this->memberRoles = new ArrayCollection();
    }

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

    public function setHash($hash)
    {
        $this->hash = $hash;
    }
    
    public function setShake($shake)
    {
        $this->shake = $shake;
    }

    public function isAdmin()
    {
        return $this->admin;
    }

    public function setAdmin($admin){
        return $this->admin = $admin;
    }

    public function getMemberRoles()
    {
        return $this->memberRoles;
    }


}